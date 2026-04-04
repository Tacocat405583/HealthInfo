/**
 * useAccess.ts
 *
 * Hooks for access control: granting, revoking, and querying access.
 *
 * Usage:
 *   // Grant a provider read access to dental records:
 *   const { grantAccess, isGranting } = useGrantAccess()
 *   await grantAccess({
 *     provider: '0x...',
 *     category: RecordCategory.Dental,
 *     level: AccessLevel.ReadOnly,
 *   })
 *
 *   // List all grants for a patient:
 *   const { grants } = useGrants(patientAddress)
 *
 *   // Check if the connected wallet has access to a specific category:
 *   const { level } = useAccessLevel(patientAddress, RecordCategory.Dental)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWeb3 } from '../providers/Web3Provider'
import { useEncryption } from '../providers/EncryptionProvider'
import { useContract } from './useContract'
import { unwrapDEK, wrapDEK } from '../services/encryption'
import { hexToUint8Array } from '../services/encryption'
import { RecordCategory, AccessLevel, type GrantInfo } from '../types/health'

// ─── Grant Access ──────────────────────────────────────────────────────────────

interface GrantAccessArgs {
  /** Provider wallet address to grant access to */
  provider: string
  category: RecordCategory
  level: AccessLevel.ReadOnly | AccessLevel.ReadWrite
}

/**
 * Grant a provider access to a specific record category.
 *
 * This hook handles the full crypto flow:
 *  1. Fetch the provider's ECIES public key from chain
 *  2. Fetch the patient's existing encryptedDEK for this category
 *  3. Decrypt the DEK with the patient's private key
 *  4. Re-encrypt the DEK with the provider's public key → providerWrappedDEK
 *  5. Post the grant on-chain
 *
 * If no record exists yet for this category, the DEK will be set to empty string
 * and the wrapped DEK will be generated when the first record is uploaded.
 */
export function useGrantAccess() {
  const svc = useContract()
  const { keypair } = useEncryption()
  const { address } = useWeb3()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (args: GrantAccessArgs) => {
      if (!svc) throw new Error('Wallet not connected')
      if (!keypair) throw new Error('Encryption keys not initialized')
      if (!address) throw new Error('No wallet address')

      // Fetch provider's ECIES public key
      const providerPubKeyHex = await svc.getProviderPublicKey(args.provider)
      if (!providerPubKeyHex) {
        throw new Error(
          `Provider ${args.provider} has not registered their ECIES public key. Ask them to register first.`,
        )
      }
      const providerPubKey = hexToUint8Array(providerPubKeyHex)

      // Fetch the existing record pointer to get the patient's encryptedDEK
      const existing = await svc.peekRecord(address, args.category)

      let providerWrappedDEK: string

      if (existing && existing.encryptedDEK) {
        // Decrypt patient's DEK → re-encrypt for provider
        const dek = await unwrapDEK(existing.encryptedDEK, keypair.privateKey)
        providerWrappedDEK = await wrapDEK(dek, providerPubKey)
      } else {
        // No record yet — use empty string; will be set properly on first upload
        providerWrappedDEK = ''
      }

      const tx = await svc.grantAccess({
        provider: args.provider,
        category: args.category,
        level: args.level,
        providerWrappedDEK,
      })
      await tx.wait()
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ['grants', address] })
      queryClient.invalidateQueries({ queryKey: ['accessLevel', args.provider] })
    },
  })

  return {
    grantAccess: mutation.mutateAsync,
    isGranting: mutation.isPending,
    grantError: mutation.error,
  }
}

// ─── Revoke Access ─────────────────────────────────────────────────────────────

export function useRevokeAccess() {
  const svc = useContract()
  const { address } = useWeb3()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ provider, category }: { provider: string; category: RecordCategory }) => {
      if (!svc) throw new Error('Wallet not connected')
      const tx = await svc.revokeAccess(provider, category)
      await tx.wait()
    },
    onSuccess: (_, args) => {
      queryClient.invalidateQueries({ queryKey: ['grants', address] })
      queryClient.invalidateQueries({ queryKey: ['accessLevel', args.provider] })
    },
  })

  return {
    revokeAccess: mutation.mutateAsync,
    isRevoking: mutation.isPending,
    revokeError: mutation.error,
  }
}

// ─── List Grants ───────────────────────────────────────────────────────────────

/**
 * List all access grants for a patient.
 * Returns grants sorted by grantedAt descending.
 */
export function useGrants(patientAddress: string | null) {
  const svc = useContract()

  return useQuery({
    queryKey: ['grants', patientAddress],
    enabled: Boolean(svc && patientAddress),
    queryFn: async (): Promise<GrantInfo[]> => {
      if (!svc || !patientAddress) return []
      const grants = await svc.listGrantsForPatient(patientAddress)
      return grants.sort((a, b) => b.grantedAt - a.grantedAt)
    },
  })
}

// ─── Check Access Level ────────────────────────────────────────────────────────

/**
 * Check the access level a specific provider has for a patient's category.
 *
 * @param patientAddress  - the patient
 * @param providerAddress - the provider (defaults to connected wallet)
 * @param category        - the category to check
 */
export function useAccessLevel(
  patientAddress: string | null,
  category: RecordCategory,
  providerAddress?: string,
) {
  const svc = useContract()
  const { address } = useWeb3()
  const provider = providerAddress ?? address ?? ''

  return useQuery({
    queryKey: ['accessLevel', patientAddress, provider, category],
    enabled: Boolean(svc && patientAddress && provider),
    queryFn: async (): Promise<AccessLevel> => {
      if (!svc || !patientAddress) return AccessLevel.None
      return svc.getAccessLevel(patientAddress, provider, category)
    },
  })
}

/**
 * Check if the connected wallet is a registered provider with access to a category.
 * Returns the access level (None, ReadOnly, ReadWrite).
 */
export function useMyAccessLevel(patientAddress: string | null, category: RecordCategory) {
  const { address } = useWeb3()
  return useAccessLevel(patientAddress, category, address ?? undefined)
}

/**
 * Get the provider's wrapped DEK for a category (needed to decrypt records as a provider).
 */
export function useProviderWrappedDEK(
  patientAddress: string | null,
  category: RecordCategory,
  providerAddress?: string,
) {
  const svc = useContract()
  const { address } = useWeb3()
  const provider = providerAddress ?? address ?? ''

  return useQuery({
    queryKey: ['providerWrappedDEK', patientAddress, provider, category],
    enabled: Boolean(svc && patientAddress && provider),
    queryFn: async (): Promise<string> => {
      if (!svc || !patientAddress) return ''
      return svc.getProviderWrappedDEK(patientAddress, provider, category)
    },
  })
}
