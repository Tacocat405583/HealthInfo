/**
 * useEncryption.ts
 *
 * High-level hook for all encryption operations.
 * Wraps the raw encryption service functions with the current user's keypair.
 *
 * Usage:
 *   const {
 *     encryptForPatient,
 *     rewrapDEKForProvider,
 *     decryptAsPatient,
 *     decryptAsProvider,
 *     encryptForUpdate,
 *   } = useEncryptionOps()
 */

import { useEncryption as useEncryptionContext } from '../providers/EncryptionProvider'
import { useContract } from './useContract'
import {
  generateDEK,
  encryptFile,
  decryptFile,
  wrapDEK,
  unwrapDEK,
} from '../services/encryption'
import { hexToUint8Array } from '../services/encryption'
import type { DEK, EncryptedBlob, WrappedDEK } from '../types/crypto'
import { RecordCategory } from '../types/health'

export function useEncryptionOps() {
  const { keypair, isReady } = useEncryptionContext()
  const svc = useContract()

  /**
   * Encrypt a file and wrap the DEK for a specific patient.
   * Use for new record uploads.
   *
   * @returns { blob, encryptedDEK } ready for IPFS + on-chain storage
   */
  async function encryptForPatient(
    file: Uint8Array,
    patientAddress: string,
  ): Promise<{ blob: EncryptedBlob; encryptedDEK: WrappedDEK }> {
    if (!svc) throw new Error('Wallet not connected')
    const dek = generateDEK()
    const patientPubKeyHex = await svc.getPatientPublicKey(patientAddress)
    const patientPubKey = hexToUint8Array(patientPubKeyHex)
    const [blob, encryptedDEK] = await Promise.all([
      encryptFile(file, dek),
      wrapDEK(dek, patientPubKey),
    ])
    return { blob, encryptedDEK }
  }

  /**
   * Re-encrypt an existing DEK for a provider.
   * Decrypts the patient's encryptedDEK, then wraps it with the provider's public key.
   *
   * @param encryptedDEK   - the patient's wrapped DEK (from RecordPointer.encryptedDEK)
   * @param providerAddress - the provider to wrap the DEK for
   */
  async function rewrapDEKForProvider(
    encryptedDEK: WrappedDEK,
    providerAddress: string,
  ): Promise<WrappedDEK> {
    if (!svc) throw new Error('Wallet not connected')
    if (!keypair) throw new Error('Encryption keys not initialized')
    const providerPubKeyHex = await svc.getProviderPublicKey(providerAddress)
    const providerPubKey = hexToUint8Array(providerPubKeyHex)
    const dek = await unwrapDEK(encryptedDEK, keypair.privateKey)
    return wrapDEK(dek, providerPubKey)
  }

  /**
   * Decrypt a file payload fetched from IPFS using the patient's encryptedDEK.
   * Use when the connected wallet IS the patient.
   *
   * @param payload      - raw bytes from IPFS
   * @param encryptedDEK - the patient's wrapped DEK from RecordPointer
   */
  async function decryptAsPatient(
    payload: Uint8Array,
    encryptedDEK: WrappedDEK,
  ): Promise<Uint8Array> {
    if (!keypair) throw new Error('Encryption keys not initialized')
    const dek = await unwrapDEK(encryptedDEK, keypair.privateKey)
    return decryptFile(payload, dek)
  }

  /**
   * Decrypt a file payload fetched from IPFS using the provider's wrapped DEK.
   * Use when the connected wallet is a PROVIDER with granted access.
   *
   * @param payload            - raw bytes from IPFS
   * @param providerWrappedDEK - the provider's wrapped DEK from getProviderWrappedDEK()
   */
  async function decryptAsProvider(
    payload: Uint8Array,
    providerWrappedDEK: WrappedDEK,
  ): Promise<Uint8Array> {
    if (!keypair) throw new Error('Encryption keys not initialized')
    const dek = await unwrapDEK(providerWrappedDEK, keypair.privateKey)
    return decryptFile(payload, dek)
  }

  /**
   * Encrypt new data for a record update, reusing the existing DEK.
   * The DEK must not change on update so existing access grants remain valid.
   *
   * @param file         - new file content
   * @param encryptedDEK - existing patient's encryptedDEK (from RecordPointer)
   */
  async function encryptForUpdate(
    file: Uint8Array,
    encryptedDEK: WrappedDEK,
  ): Promise<{ blob: EncryptedBlob; encryptedDEK: WrappedDEK }> {
    if (!keypair) throw new Error('Encryption keys not initialized')
    const dek = await unwrapDEK(encryptedDEK, keypair.privateKey)
    const blob = await encryptFile(file, dek)
    // Return same encryptedDEK — DEK is unchanged
    return { blob, encryptedDEK }
  }

  return {
    isReady,
    encryptForPatient,
    rewrapDEKForProvider,
    decryptAsPatient,
    decryptAsProvider,
    encryptForUpdate,
  }
}
