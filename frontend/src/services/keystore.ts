/**
 * keystore.ts
 *
 * Persists the user's ECIES private key in IndexedDB, encrypted with AES-256-GCM
 * using a key derived from their MetaMask signature.
 *
 * This means:
 *  - The private key survives page reloads without requiring a re-sign
 *  - But it can always be re-derived from MetaMask if IndexedDB is cleared
 *  - The raw private key never sits unprotected in storage
 */

import { openDB, type IDBPDatabase } from 'idb'
import { encryptFile, decryptFile } from './encryption'

const DB_NAME = 'healthvault-keystore'
const DB_VERSION = 1
const STORE_NAME = 'keys'

interface StoredKey {
  /** address (lowercase) */
  id: string
  /** AES-encrypted private key bytes (self-describing blob format from encryptFile) */
  encryptedPrivKey: Uint8Array
  /** 32-byte AES key derived from signature, stored as base64 — only in memory, NOT here */
  _placeholder?: never
}

let _db: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    },
  })
  return _db
}

/**
 * Derive a 32-byte AES key from the MetaMask signature.
 * Used to encrypt the ECIES private key at rest.
 */
async function deriveStorageKey(signature: string): Promise<CryptoKey> {
  // SHA-256 of the signature bytes → raw AES-256 key
  const sigBytes = hexToBytes(signature.startsWith('0x') ? signature.slice(2) : signature)
  const keyBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', sigBytes))
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Save an ECIES private key to IndexedDB, encrypted with the given signature.
 *
 * @param address   - wallet address (used as storage key)
 * @param privKey   - 32-byte ECIES private key
 * @param signature - MetaMask signature (used to derive the storage encryption key)
 */
export async function savePrivateKey(
  address: string,
  privKey: Uint8Array,
  signature: string,
): Promise<void> {
  const storageKey = await deriveStorageKey(signature)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, storageKey, privKey),
  )

  // Store as a simple blob: [12 IV bytes][ciphertext bytes]
  const blob = new Uint8Array(12 + ciphertext.byteLength)
  blob.set(iv, 0)
  blob.set(ciphertext, 12)

  const db = await getDB()
  await db.put(STORE_NAME, { id: address.toLowerCase(), encryptedPrivKey: blob })
}

/**
 * Load and decrypt the ECIES private key from IndexedDB.
 * Returns null if the key has not been stored for this address.
 *
 * @param address   - wallet address
 * @param signature - MetaMask signature (same one used during savePrivateKey)
 */
export async function loadPrivateKey(
  address: string,
  signature: string,
): Promise<Uint8Array | null> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, address.toLowerCase()) as StoredKey | undefined
  if (!record) return null

  const storageKey = await deriveStorageKey(signature)
  const blob = record.encryptedPrivKey
  const iv = blob.slice(0, 12)
  const ciphertext = blob.slice(12)

  try {
    return new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, storageKey, ciphertext),
    )
  } catch {
    // Wrong signature / corrupted data — caller should re-derive from signature
    return null
  }
}

/**
 * Remove a stored private key (e.g., on logout or key rotation).
 */
export async function removePrivateKey(address: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, address.toLowerCase())
}

/**
 * Check whether a private key is stored for the given address.
 */
export async function hasStoredKey(address: string): Promise<boolean> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, address.toLowerCase())
  return record !== undefined
}
