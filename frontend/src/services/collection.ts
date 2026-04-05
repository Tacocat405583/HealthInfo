/**
 * collection.ts
 *
 * Generic CRUD for JSON array "collections" stored in IPFS, backed by the HealthVault contract.
 *
 * Every RecordCategory slot holds one encrypted IPFS blob that is a JSON array.
 * This service treats that blob as an append/update/delete collection.
 *
 * Flow for read:
 *   peekRecord(patient, category) → CID
 *   fetchFromIPFS(CID) → encryptedBlob
 *   decryptFile(blob, DEK) → JSON.parse → T[]
 *
 * Flow for write:
 *   read existing array (or start empty)
 *   modify array
 *   JSON.stringify → TextEncoder → Uint8Array
 *   encryptFile(bytes, DEK) → blob
 *   uploadToIPFS(blob) → newCID
 *   addRecord or updateRecord on chain
 */

import { encryptFile, decryptFile, generateDEK, wrapDEK, unwrapDEK } from './encryption'
import { uploadToIPFS, fetchFromIPFS } from './ipfs'
import type { HealthVaultService } from './contract'
import type { ECIESKeypair } from '../types/crypto'
import { RecordCategory } from '../types/health'

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Read the JSON array collection for a patient + category.
 * Returns an empty array if no record exists yet.
 *
 * @param patient   - patient wallet address
 * @param category  - RecordCategory slot to read
 * @param keypair   - ECIES keypair of the caller (patient or provider)
 * @param svc       - HealthVaultService instance
 * @param asProvider - if set, uses the provider's wrapped DEK instead of patient's
 */
export async function getCollection<T>(
  patient: string,
  category: RecordCategory,
  keypair: ECIESKeypair,
  svc: HealthVaultService,
  asProvider?: { providerAddress: string },
): Promise<T[]> {
  const pointer = await svc.peekRecord(patient, category)
  if (!pointer || !pointer.cid) return []

  const payload = await fetchFromIPFS(pointer.cid)

  let wrappedDEK: string
  if (asProvider) {
    wrappedDEK = await svc.getProviderWrappedDEK(patient, asProvider.providerAddress, category)
    if (!wrappedDEK) return []
  } else {
    wrappedDEK = pointer.encryptedDEK
  }

  const dek = await unwrapDEK(wrappedDEK, keypair.privateKey)
  const plaintext = await decryptFile(payload, dek)
  const text = new TextDecoder().decode(plaintext)

  try {
    return JSON.parse(text) as T[]
  } catch {
    return []
  }
}

// ─── Write helpers ─────────────────────────────────────────────────────────────

/**
 * Encrypt a JSON array and write it to IPFS + contract.
 * Handles both first-time writes (addRecord) and updates (updateRecord).
 * Always preserves the existing DEK if one exists (so provider access stays valid).
 */
async function writeCollection<T>(
  patient: string,
  category: RecordCategory,
  items: T[],
  keypair: ECIESKeypair,
  svc: HealthVaultService,
): Promise<void> {
  const json = JSON.stringify(items)
  const bytes = new TextEncoder().encode(json)

  const existing = await svc.peekRecord(patient, category)

  let dek: Uint8Array
  let encryptedDEK: string

  if (existing && existing.encryptedDEK) {
    // Reuse existing DEK — provider access grants remain valid
    dek = await unwrapDEK(existing.encryptedDEK, keypair.privateKey)
    encryptedDEK = existing.encryptedDEK
  } else {
    // First write — generate new DEK, wrap for patient
    dek = generateDEK()
    const patientPubKey = keypair.publicKey
    encryptedDEK = await wrapDEK(dek, patientPubKey)
  }

  const blob = await encryptFile(bytes, dek)
  const cid = await uploadToIPFS(blob.payload, `collection-${category}`)

  const params = { patient, category, cid, dataHash: blob.dataHash, encryptedDEK }

  if (existing) {
    const tx = await svc.updateRecord(params)
    await tx.wait()
  } else {
    const tx = await svc.addRecord(params)
    await tx.wait()
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Add one item to a collection.
 * Reads the existing array, appends the item, saves back.
 */
export async function addToCollection<T extends { id: string }>(
  patient: string,
  category: RecordCategory,
  item: T,
  keypair: ECIESKeypair,
  svc: HealthVaultService,
): Promise<void> {
  const existing = await getCollection<T>(patient, category, keypair, svc)
  await writeCollection(patient, category, [...existing, item], keypair, svc)
}

/**
 * Update one item in a collection by id.
 * If item with that id doesn't exist, appends it.
 */
export async function updateInCollection<T extends { id: string }>(
  patient: string,
  category: RecordCategory,
  updatedItem: T,
  keypair: ECIESKeypair,
  svc: HealthVaultService,
): Promise<void> {
  const existing = await getCollection<T>(patient, category, keypair, svc)
  const idx = existing.findIndex((i) => i.id === updatedItem.id)
  const next = idx >= 0
    ? existing.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    : [...existing, updatedItem]
  await writeCollection(patient, category, next, keypair, svc)
}

/**
 * Remove one item from a collection by id.
 */
export async function removeFromCollection<T extends { id: string }>(
  patient: string,
  category: RecordCategory,
  itemId: string,
  keypair: ECIESKeypair,
  svc: HealthVaultService,
): Promise<void> {
  const existing = await getCollection<T>(patient, category, keypair, svc)
  await writeCollection(patient, category, existing.filter((i) => i.id !== itemId), keypair, svc)
}

/**
 * Replace the entire collection with a new array.
 */
export async function saveCollection<T>(
  patient: string,
  category: RecordCategory,
  items: T[],
  keypair: ECIESKeypair,
  svc: HealthVaultService,
): Promise<void> {
  await writeCollection(patient, category, items, keypair, svc)
}
