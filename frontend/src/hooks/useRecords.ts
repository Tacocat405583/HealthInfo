/**
 * useRecords.ts
 *
 * Hooks for reading and writing health records.
 * Handles the full flow: encrypt → IPFS upload → on-chain write (and reverse).
 *
 * Usage (patient uploading a new record):
 *   const { uploadRecord, isUploading } = useUploadRecord()
 *   await uploadRecord({ patient: address, category: RecordCategory.Dental, file, mimeType, filename })
 *
 * Usage (viewing a record):
 *   const { record, isLoading } = useRecord(patientAddress, RecordCategory.Dental)
 *   // record.objectUrl is a Blob URL ready for <img> / <iframe> / download link
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWeb3 } from '../providers/Web3Provider'
import { useEncryption } from '../providers/EncryptionProvider'
import { useContract } from './useContract'
import { generateDEK, encryptFile, decryptFile, wrapDEK, unwrapDEK } from '../services/encryption'
import { uploadToIPFS, fetchFromIPFS } from '../services/ipfs'
import { hexToUint8Array } from '../services/encryption'
import { RecordCategory, type DecryptedRecord } from '../types/health'
import type { RecordPointer } from '../types/health'

// ─── Read a single record ──────────────────────────────────────────────────────

interface UseRecordOptions {
  /** If true, the caller is a provider — uses providerWrappedDEK for decryption */
  asProvider?: boolean
  /** Provider address (needed when asProvider = true) */
  providerAddress?: string
}

/**
 * Fetch, decrypt, and return a health record for a patient + category.
 *
 * @param patientAddress - the patient's wallet address
 * @param category       - the RecordCategory to fetch
 * @param options        - asProvider flag for provider-side access
 */
export function useRecord(
  patientAddress: string | null,
  category: RecordCategory,
  options: UseRecordOptions = {},
) {
  const svc = useContract()
  const { keypair } = useEncryption()

  const queryKey = ['record', patientAddress, category, options.asProvider ? 'provider' : 'patient']

  const query = useQuery({
    queryKey,
    enabled: Boolean(svc && patientAddress && keypair),
    queryFn: async (): Promise<DecryptedRecord | null> => {
      if (!svc || !patientAddress || !keypair) return null

      // Fetch pointer from chain (emits RecordAccessed event)
      const pointer = await svc.getRecord(patientAddress, category)
      if (!pointer || !pointer.cid) return null

      // Fetch encrypted blob from IPFS
      const payload = await fetchFromIPFS(pointer.cid)

      // Determine which wrapped DEK to use
      let wrappedDEK: string
      if (options.asProvider && options.providerAddress) {
        wrappedDEK = await svc.getProviderWrappedDEK(patientAddress, options.providerAddress, category)
      } else {
        wrappedDEK = pointer.encryptedDEK
      }

      // Decrypt DEK
      const dek = await unwrapDEK(wrappedDEK, keypair.privateKey)

      // Decrypt file content
      const plaintext = await decryptFile(payload, dek)

      // Try to extract MIME type from the first bytes or default to octet-stream
      const mimeType = detectMimeType(plaintext) ?? 'application/octet-stream'
      const blob = new Blob([plaintext as BlobPart], { type: mimeType })
      const objectUrl = URL.createObjectURL(blob)

      return {
        category,
        mimeType,
        filename: `record-${category}-${pointer.updatedAt}`,
        data: plaintext,
        objectUrl,
        pointer,
      }
    },
  })

  // Revoke object URLs when the query result changes
  // (in a real app you'd do this in a useEffect cleanup)

  return {
    record: query.data ?? null,
    pointer: query.data?.pointer ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Fetch only the on-chain RecordPointer without decrypting.
 * Useful for showing metadata (timestamp, who last modified) without full decrypt.
 */
export function useRecordPointer(patientAddress: string | null, category: RecordCategory) {
  const svc = useContract()

  return useQuery({
    queryKey: ['recordPointer', patientAddress, category],
    enabled: Boolean(svc && patientAddress),
    queryFn: async (): Promise<RecordPointer | null> => {
      if (!svc || !patientAddress) return null
      return svc.peekRecord(patientAddress, category)
    },
  })
}

// ─── Upload a record ───────────────────────────────────────────────────────────

interface UploadRecordArgs {
  patient: string
  category: RecordCategory
  /** The file binary contents */
  file: Uint8Array
  mimeType: string
  filename?: string
}

/**
 * Upload a new or updated health record.
 *
 * For a patient uploading their own record:
 *   - Generates a new DEK (first upload) or reuses the existing DEK (update)
 *   - Encrypts the file
 *   - Uploads to IPFS
 *   - Posts the CID + hash + encryptedDEK on-chain
 *
 * For a provider updating a record (ReadWrite access):
 *   - Decrypts the existing DEK using providerWrappedDEK
 *   - Reuses it for the new upload (access grants remain valid)
 */
export function useUploadRecord() {
  const svc = useContract()
  const { keypair } = useEncryption()
  const { address } = useWeb3()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (args: UploadRecordArgs & { providerWrappedDEK?: string }) => {
      if (!svc) throw new Error('Wallet not connected')
      if (!keypair) throw new Error('Encryption keys not initialized')

      const isPatient = args.patient.toLowerCase() === address?.toLowerCase()

      let dek: Uint8Array
      let encryptedDEK: string
      let isUpdate = false

      // Check if a record already exists to determine whether to add or update
      const existing = await svc.peekRecord(args.patient, args.category)

      if (existing) {
        isUpdate = true
        // Reuse the existing DEK so that existing access grants remain valid
        if (isPatient) {
          dek = await unwrapDEK(existing.encryptedDEK, keypair.privateKey)
          encryptedDEK = existing.encryptedDEK
        } else {
          // Provider path: use their wrapped DEK
          if (!args.providerWrappedDEK) throw new Error('providerWrappedDEK required for provider update')
          dek = await unwrapDEK(args.providerWrappedDEK, keypair.privateKey)
          encryptedDEK = existing.encryptedDEK // keep patient's version on-chain
        }
      } else {
        // First upload — generate a new DEK and wrap it for the patient
        dek = generateDEK()
        const patientPubKeyHex = await svc.getPatientPublicKey(args.patient)
        const patientPubKey = hexToUint8Array(patientPubKeyHex)
        encryptedDEK = await wrapDEK(dek, patientPubKey)
      }

      // Encrypt file
      const blob = await encryptFile(args.file, dek)

      // Upload to IPFS
      const cid = await uploadToIPFS(blob.payload, args.filename ?? 'record')

      // Write on-chain
      const params = {
        patient: args.patient,
        category: args.category,
        cid,
        dataHash: blob.dataHash,
        encryptedDEK,
      }

      const tx = isUpdate ? await svc.updateRecord(params) : await svc.addRecord(params)
      await tx.wait()

      return { cid, dataHash: blob.dataHash }
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ['record', args.patient, args.category] })
      queryClient.invalidateQueries({ queryKey: ['recordPointer', args.patient, args.category] })
    },
  })

  return {
    uploadRecord: mutation.mutateAsync,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Sniff MIME type from magic bytes */
function detectMimeType(data: Uint8Array): string | null {
  if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) return 'application/pdf'
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'image/png'
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return 'image/gif'
  const text = new TextDecoder().decode(data.slice(0, 32))
  if (text.startsWith('{') || text.startsWith('[')) return 'application/json'
  return null
}
