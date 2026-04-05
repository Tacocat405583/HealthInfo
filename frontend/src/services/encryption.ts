/**
 * encryption.ts
 *
 * All cryptographic operations for HealthVault.
 *
 * Stack:
 *  - AES-256-GCM  (Web Crypto API — no library, browser-native)
 *  - ECIES        (@noble/curves secp256k1 + @noble/hashes HKDF)
 *
 * ECIES envelope format (base64-encoded wrapped DEK):
 *   [33 bytes ephemeral compressed pubkey]
 *   [12 bytes AES-GCM IV]
 *   [32 bytes AES-GCM ciphertext of DEK]
 *   [16 bytes AES-GCM auth tag]
 *   Total: 93 bytes → ~124 chars base64
 *
 * IPFS blob format:
 *   [4 bytes IV length, little-endian]
 *   [IV bytes]
 *   [4 bytes ciphertext length, little-endian]
 *   [ciphertext bytes (includes GCM auth tag)]
 */

import { secp256k1 } from '@noble/curves/secp256k1'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils'
import type { ECIESKeypair, WrappedDEK, DEK, EncryptedBlob } from '../types/crypto'

// ─── Key Derivation ────────────────────────────────────────────────────────────

/**
 * Derive a deterministic ECIES secp256k1 keypair from a MetaMask personal_sign signature.
 *
 * Usage:
 *   const sig = await signer.signMessage("HealthVault Key Derivation v1:" + address)
 *   const keypair = await deriveKeypairFromSignature(sig)
 */
export function deriveKeypairFromSignature(signature: string): ECIESKeypair {
  const sigBytes = hexToBytes(signature.startsWith('0x') ? signature.slice(2) : signature)
  // Ethereum personal_sign signatures are always 65 bytes (r:32 || s:32 || v:1).
  // Any other length means a malformed/truncated signature, which would otherwise
  // silently derive a non-deterministic keypair across retries.
  if (sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: expected 65 bytes, got ${sigBytes.length}`)
  }
  // HKDF-SHA256: input key material = signature, no salt, info = domain string
  const privateKey = hkdf(sha256, sigBytes, new Uint8Array(0), 'healthvault-ecies-v1', 32)
  const publicKey = secp256k1.getPublicKey(privateKey, true) // compressed 33 bytes
  return {
    privateKey,
    publicKey,
    publicKeyHex: '0x' + bytesToHex(publicKey),
  }
}

/** The MetaMask message to sign for key derivation. Always use this exact string. */
export function keyDerivationMessage(address: string): string {
  return `HealthVault Key Derivation v1:${address.toLowerCase()}`
}

// ─── DEK Generation ───────────────────────────────────────────────────────────

/** Generate a cryptographically random 256-bit Data Encryption Key. */
export function generateDEK(): DEK {
  return crypto.getRandomValues(new Uint8Array(32))
}

// ─── AES-256-GCM (file encryption) ────────────────────────────────────────────

/**
 * Encrypt arbitrary binary data with AES-256-GCM.
 * Returns an EncryptedBlob ready for IPFS upload.
 */
export async function encryptFile(data: Uint8Array, dek: DEK): Promise<EncryptedBlob> {
  const key = await importAESKey(dek)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data),
  )

  // Build self-describing payload: [4B IV len][IV][4B ciphertext len][ciphertext]
  const ivLen = new Uint8Array(4)
  new DataView(ivLen.buffer).setUint32(0, iv.byteLength, true)
  const ctLen = new Uint8Array(4)
  new DataView(ctLen.buffer).setUint32(0, ciphertext.byteLength, true)
  const payload = concatBytes(ivLen, iv, ctLen, ciphertext)
  const dataHash = '0x' + bytesToHex(keccak_256(payload))

  return { payload, iv, dataHash }
}

/**
 * Decrypt an EncryptedBlob payload fetched from IPFS.
 */
export async function decryptFile(payload: Uint8Array, dek: DEK): Promise<Uint8Array> {
  // Minimum payload = 4-byte ivLen + (at least 12-byte) iv + 4-byte ctLen + (at least 16-byte) GCM tag.
  // Validate lengths before slicing so a corrupted/truncated payload fails with a clear
  // error instead of a cryptic GCM authentication failure downstream.
  if (payload.byteLength < 8) {
    throw new Error('Payload corrupted: too short to contain header')
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  let offset = 0

  const ivLen = view.getUint32(offset, true)
  offset += 4
  if (offset + ivLen > payload.byteLength) {
    throw new Error(`Payload corrupted: IV extends beyond payload (ivLen=${ivLen})`)
  }
  const iv = payload.slice(offset, offset + ivLen)
  offset += ivLen

  if (offset + 4 > payload.byteLength) {
    throw new Error('Payload corrupted: missing ciphertext length header')
  }
  const ctLen = view.getUint32(offset, true)
  offset += 4
  if (offset + ctLen > payload.byteLength) {
    throw new Error(`Payload corrupted: ciphertext extends beyond payload (ctLen=${ctLen})`)
  }
  const ciphertext = payload.slice(offset, offset + ctLen)

  const key = await importAESKey(dek)
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext))
}

// ─── ECIES (DEK wrapping) ──────────────────────────────────────────────────────

/**
 * Wrap (encrypt) a DEK with a recipient's ECIES public key.
 * Returns a base64 string that can be stored on-chain.
 *
 * @param dek            - 32-byte raw DEK to wrap
 * @param recipientPubKey - 33-byte compressed secp256k1 public key of the recipient
 */
export async function wrapDEK(dek: DEK, recipientPubKey: Uint8Array): Promise<WrappedDEK> {
  // Generate ephemeral keypair
  const ephemeralPrivKey = secp256k1.utils.randomPrivateKey()
  const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true)

  // ECDH shared secret. @noble/curves returns a compressed point (33 bytes:
  // 1-byte parity prefix || 32-byte x-coordinate) by default — slice(1) yields
  // the standard 32-byte x-only shared secret used as HKDF input material.
  // See: node_modules/@noble/curves/README.md and weierstrass.js ecdh().
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivKey, recipientPubKey)
  if (sharedPoint.length !== 33) {
    throw new Error(`Unexpected ECDH shared point length: ${sharedPoint.length} (expected 33)`)
  }
  const sharedSecret = sharedPoint.slice(1)

  // Derive 32-byte AES key via HKDF (info binds to the ephemeral pubkey)
  const encKey = hkdf(sha256, sharedSecret, ephemeralPubKey, 'healthvault-dek-wrap-v1', 32)

  // Encrypt DEK with AES-256-GCM
  const cryptoKey = await importAESKey(encKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedDEK = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, dek),
  )

  // Envelope: [33 ephemeral pubkey][12 IV][32+16 encrypted DEK+tag] = 93 bytes
  const envelope = concatBytes(ephemeralPubKey, iv, encryptedDEK)
  return uint8ArrayToBase64(envelope)
}

/**
 * Unwrap (decrypt) a wrapped DEK using the recipient's ECIES private key.
 *
 * @param wrappedDEK  - base64 string from on-chain storage
 * @param myPrivKey   - 32-byte ECIES private key of the recipient
 */
export async function unwrapDEK(wrappedDEK: WrappedDEK, myPrivKey: Uint8Array): Promise<DEK> {
  const envelope = base64ToUint8Array(wrappedDEK)
  // Envelope is exactly 93 bytes: [33 ephemeral pubkey][12 IV][32 DEK + 16 GCM tag].
  // A truncated/corrupted base64 string would otherwise slice past the end and
  // produce a cryptic GCM auth failure instead of a clear error.
  if (envelope.length !== 93) {
    throw new Error(`Invalid wrapped DEK envelope: expected 93 bytes, got ${envelope.length}`)
  }

  const ephemeralPubKey = envelope.slice(0, 33)
  const iv = envelope.slice(33, 45)
  const encryptedDEK = envelope.slice(45) // 48 bytes: 32 DEK + 16 GCM tag

  // ECDH — same compressed-point convention as wrapDEK (see comment there).
  const sharedPoint = secp256k1.getSharedSecret(myPrivKey, ephemeralPubKey)
  if (sharedPoint.length !== 33) {
    throw new Error(`Unexpected ECDH shared point length: ${sharedPoint.length} (expected 33)`)
  }
  const sharedSecret = sharedPoint.slice(1)

  const encKey = hkdf(sha256, sharedSecret, ephemeralPubKey, 'healthvault-dek-wrap-v1', 32)
  const cryptoKey = await importAESKey(encKey)

  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encryptedDEK),
  )
}

// ─── Utility ──────────────────────────────────────────────────────────────────

async function importAESKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function hexToUint8Array(hex: string): Uint8Array {
  return hexToBytes(hex.startsWith('0x') ? hex.slice(2) : hex)
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return '0x' + bytesToHex(bytes)
}
