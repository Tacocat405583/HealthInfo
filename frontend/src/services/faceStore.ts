/**
 * faceStore.ts
 *
 * Persistence layer for the face-recognition 2FA flow.
 *
 * Three storage layers, each with a distinct purpose:
 *
 *   1. IndexedDB (healthvault-faces) — fast local cache. Survives page
 *      reloads. Cleared only on explicit reset or manual DevTools wipe.
 *
 *   2. IPFS (via Pinata) — durable backup for cross-device recovery.
 *      Pinned with a metadata name derived deterministically from the
 *      wallet address, so a new device can look up the CID by wallet
 *      alone — no user-memorized CIDs.
 *
 *   3. Manual CID fallback — for dev environments without Pinata. User
 *      copies the CID at enrollment time and pastes it back for recovery.
 *
 * Encryption:
 *   Descriptors are AES-256-GCM encrypted with a key derived from the
 *   MetaMask signature of keyDerivationMessage(address). The SAME
 *   signature that unlocks the ECIES private key in keystore.ts is used
 *   here — a deliberate UX optimization that means the user signs exactly
 *   once per login. See plan doc for the cryptographic domain-separation
 *   caveat.
 */

import { openDB, type IDBPDatabase } from 'idb'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex } from '@noble/hashes/utils'
import { uploadToIPFS, fetchFromIPFS } from './ipfs'
import { serializeDescriptor, deserializeDescriptor } from './faceAuth'
import type { StoredFace } from '../types/faceAuth'

// ─── IndexedDB ────────────────────────────────────────────────────────────────

const DB_NAME = 'healthvault-faces'
const DB_VERSION = 1
const STORE_NAME = 'faces'

let _db: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
  return _db
}

// ─── Byte helpers ─────────────────────────────────────────────────────────────

/**
 * Copy a Uint8Array into a freshly-allocated ArrayBuffer.
 * Required because Web Crypto under TypeScript 5's strict buffer generics
 * refuses Uint8Array<ArrayBufferLike> — it must be Uint8Array<ArrayBuffer>
 * or plain ArrayBuffer. Slicing or subarray'ing inherits the parent's
 * ArrayBufferLike, so we need an actual copy.
 */
function toOwnedArrayBuffer(u: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u.byteLength)
  new Uint8Array(ab).set(u)
  return ab
}

function hexToBytes(hex: string): Uint8Array {
  // Defensive validation — without these guards, odd-length strings would
  // silently truncate and non-hex characters would produce NaN bytes.
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string: length must be even')
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex string: contains non-hex characters')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Derive a 32-byte AES key from the MetaMask signature.
 * This mirrors deriveStorageKey() in keystore.ts:45 — intentionally kept as
 * a local helper here to avoid coupling the two subsystems. If you change
 * this, also update keystore.ts (or refactor both to share a helper).
 */
async function deriveStorageKey(signature: string): Promise<CryptoKey> {
  const sigBytes = hexToBytes(signature.startsWith('0x') ? signature.slice(2) : signature)
  const digest = await crypto.subtle.digest('SHA-256', toOwnedArrayBuffer(sigBytes))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Encrypt a face descriptor with AES-256-GCM.
 * Output layout: [12 bytes IV][ciphertext + 16 bytes GCM tag] — matches the
 * format keystore.ts uses for ECIES private keys.
 *
 * We pass ArrayBuffers (not Uint8Array views) to crypto.subtle because TS 5's
 * strict buffer generics require Uint8Array<ArrayBuffer> and Uint8Array views
 * that came from slicing or subarray'ing inherit ArrayBufferLike.
 */
export async function encryptDescriptor(
  descriptor: Float32Array,
  signature: string,
): Promise<Uint8Array> {
  const plainBuffer = toOwnedArrayBuffer(serializeDescriptor(descriptor))
  const key = await deriveStorageKey(signature)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBuffer),
  )
  const blob = new Uint8Array(12 + ciphertext.byteLength)
  blob.set(iv, 0)
  blob.set(ciphertext, 12)
  return blob
}

/**
 * Decrypt an encrypted descriptor blob. Throws on tamper / wrong signature.
 *
 * Layout: [12 IV][ciphertext + 16 GCM tag]. Valid blobs are always 540 bytes
 * (12 + 512 descriptor + 16 tag), but we accept any length ≥ 28 to allow
 * future schema changes without breaking old data.
 */
export async function decryptDescriptor(
  blob: Uint8Array,
  signature: string,
): Promise<Float32Array> {
  const MIN_BLOB_BYTES = 12 /* IV */ + 16 /* GCM tag */
  if (blob.byteLength < MIN_BLOB_BYTES) {
    throw new Error(
      `Encrypted blob too short: ${blob.byteLength} bytes (minimum ${MIN_BLOB_BYTES})`,
    )
  }
  const key = await deriveStorageKey(signature)
  const ivBuffer = toOwnedArrayBuffer(blob.subarray(0, 12))
  const ctBuffer = toOwnedArrayBuffer(blob.subarray(12))
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuffer }, key, ctBuffer),
  )
  return deserializeDescriptor(plaintext)
}

// ─── Deterministic IPFS naming ────────────────────────────────────────────────

const IPFS_FILENAME_DOMAIN = 'healthvault-face-v1:'
const IPFS_FILENAME_PREFIX = 'face-'

/**
 * Deterministic filename for Pinata metadata lookup.
 * Because this depends only on the wallet address, any device signed in to
 * the same MetaMask account can compute it and look up the pin.
 *
 *   keccak256("healthvault-face-v1:" + address.toLowerCase())
 *
 * The domain prefix prevents collisions with other uses of the same wallet
 * address across different apps on Pinata.
 */
export function deterministicFilename(address: string): string {
  const input = new TextEncoder().encode(IPFS_FILENAME_DOMAIN + address.toLowerCase())
  const tag = bytesToHex(keccak_256(input))
  return `${IPFS_FILENAME_PREFIX}${tag}.bin`
}

// ─── Local (IndexedDB) persistence ────────────────────────────────────────────

export async function saveFaceLocal(
  address: string,
  encryptedBlob: Uint8Array,
  cid: string,
): Promise<void> {
  const db = await getDB()
  const record: StoredFace = {
    id: address.toLowerCase(),
    encryptedBlob,
    cid,
    enrolledAt: Date.now(),
    schemaVersion: 1,
  }
  await db.put(STORE_NAME, record)
}

export async function loadFaceLocal(address: string): Promise<StoredFace | null> {
  const db = await getDB()
  const record = (await db.get(STORE_NAME, address.toLowerCase())) as StoredFace | undefined
  return record ?? null
}

export async function removeFaceLocal(address: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, address.toLowerCase())
}

export async function hasFaceLocal(address: string): Promise<boolean> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, address.toLowerCase())
  return record !== undefined
}

// ─── IPFS upload / recovery ───────────────────────────────────────────────────

/**
 * Pin the encrypted descriptor blob to IPFS with the deterministic filename.
 * Returns the CID for local caching.
 */
export async function uploadFaceToIPFS(
  blob: Uint8Array,
  address: string,
): Promise<string> {
  const filename = deterministicFilename(address)
  return uploadToIPFS(blob, filename)
}

interface RecoveryResult {
  descriptor: Float32Array
  cid: string
  encryptedBlob: Uint8Array
}

/** True when Pinata auto-lookup is available. Callers use this to decide
 *  whether it's worth prompting the user to sign for recovery. */
export function isPinataConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PINATA_JWT)
}

/**
 * Look up a user's pinned face blob on Pinata by the deterministic filename
 * derived from their wallet. Returns just the CID — no signature needed for
 * the lookup. Caller then passes the CID to recoverFaceFromCID() along with
 * a freshly-minted signature to perform the actual decryption.
 *
 * Returns null when:
 *   - VITE_PINATA_JWT is not configured (dev/local Kubo mode)
 *   - No pin matches this wallet
 */
export async function lookupFaceCID(address: string): Promise<string | null> {
  const jwt = import.meta.env.VITE_PINATA_JWT as string | undefined
  if (!jwt) {
    console.info('[faceStore] Pinata JWT not configured, skipping auto-recovery')
    return null
  }

  const filename = deterministicFilename(address)
  const url = `https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=${encodeURIComponent(filename)}&pageLimit=1`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  })
  if (!res.ok) {
    throw new Error(`Pinata lookup failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as {
    count: number
    rows: Array<{ ipfs_pin_hash: string; metadata: { name: string } }>
  }
  if (data.count === 0 || data.rows.length === 0) return null
  return data.rows[0].ipfs_pin_hash
}

/**
 * Recover a face descriptor from any IPFS CID using a caller-provided
 * signature. Works for both auto-recovery (after lookupFaceCID) and manual
 * paste paths. Signature is what the wallet produces for
 * keyDerivationMessage(address) — deterministic across devices.
 */
export async function recoverFaceFromCID(
  cid: string,
  signature: string,
): Promise<RecoveryResult> {
  const encryptedBlob = await fetchFromIPFS(cid)
  const descriptor = await decryptDescriptor(encryptedBlob, signature)
  return { descriptor, cid, encryptedBlob }
}
