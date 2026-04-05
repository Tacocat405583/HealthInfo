/**
 * useCollection.ts
 *
 * React Query wrappers for the collection service.
 *
 * When the HealthVault contract is available (svc != null) and encryption keys
 * are ready, data flows through IPFS + on-chain.  When the contract is not
 * reachable (wrong network, no Hardhat node), the hooks transparently fall back
 * to localStorage so the UI stays functional during development / demos.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEncryption } from '../providers/EncryptionProvider'
import { useContract } from './useContract'
import {
  getCollection,
  addToCollection,
  updateInCollection,
  removeFromCollection,
  saveCollection,
} from '../services/collection'
import {
  localGet,
  localAdd,
  localUpdate,
  localRemove,
} from '../services/localCollection'
import { RecordCategory } from '../types/health'

interface CollectionOptions {
  asProvider?: boolean
  providerAddress?: string
  enabled?: boolean
  /** Force localStorage even when a contract + keypair are available */
  localOnly?: boolean
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useCollection<T>(
  patient: string | null,
  category: RecordCategory,
  options: CollectionOptions = {},
) {
  const { keypair } = useEncryption()
  const svc = useContract()

  return useQuery({
    queryKey: ['collection', patient, category, options.asProvider ? options.providerAddress : 'patient'],
    // Enable when patient is set and caller says so; svc/keypair are optional (we fall back)
    enabled: Boolean(patient && options.enabled !== false),
    queryFn: async (): Promise<T[]> => {
      if (!patient) return []

      // ── Real path (IPFS + contract) ──────────────────────────────────────────
      if (svc && keypair && !options.localOnly) {
        try {
          return await getCollection<T>(
            patient,
            category,
            keypair,
            svc,
            options.asProvider && options.providerAddress
              ? { providerAddress: options.providerAddress }
              : undefined,
          )
        } catch {
          // IPFS or contract unreachable — fall back to localStorage
          return localGet<T>(patient, category)
        }
      }

      // ── localStorage fallback ─────────────────────────────────────────────────
      return localGet<T>(patient, category)
    },
  })
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export function useAddToCollection<T extends { id: string }>(opts: { localOnly?: boolean } = {}) {
  const { keypair } = useEncryption()
  const svc = useContract()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      patient,
      category,
      item,
    }: {
      patient: string
      category: RecordCategory
      item: T
    }) => {
      if (svc && keypair && !opts.localOnly) {
        try {
          await addToCollection(patient, category, item, keypair, svc)
        } catch {
          localAdd<T>(patient, category, item)
        }
      } else {
        localAdd<T>(patient, category, item)
      }
    },
    onSuccess: (_, { patient, category }) => {
      queryClient.invalidateQueries({ queryKey: ['collection', patient, category] })
    },
  })

  return { add: mutation.mutateAsync, isAdding: mutation.isPending, addError: mutation.error }
}

export function useUpdateInCollection<T extends { id: string }>(opts: { localOnly?: boolean } = {}) {
  const { keypair } = useEncryption()
  const svc = useContract()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      patient,
      category,
      item,
    }: {
      patient: string
      category: RecordCategory
      item: T
    }) => {
      if (svc && keypair && !opts.localOnly) {
        try {
          await updateInCollection(patient, category, item, keypair, svc)
        } catch {
          localUpdate<T>(patient, category, item)
        }
      } else {
        localUpdate<T>(patient, category, item)
      }
    },
    onSuccess: (_, { patient, category }) => {
      queryClient.invalidateQueries({ queryKey: ['collection', patient, category] })
    },
  })

  return { update: mutation.mutateAsync, isUpdating: mutation.isPending, updateError: mutation.error }
}

export function useRemoveFromCollection(opts: { localOnly?: boolean } = {}) {
  const { keypair } = useEncryption()
  const svc = useContract()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      patient,
      category,
      itemId,
    }: {
      patient: string
      category: RecordCategory
      itemId: string
    }) => {
      if (svc && keypair && !opts.localOnly) {
        try {
          await removeFromCollection(patient, category, itemId, keypair, svc)
        } catch {
          localRemove(patient, category, itemId)
        }
      } else {
        localRemove(patient, category, itemId)
      }
    },
    onSuccess: (_, { patient, category }) => {
      queryClient.invalidateQueries({ queryKey: ['collection', patient, category] })
    },
  })

  return { remove: mutation.mutateAsync, isRemoving: mutation.isPending, removeError: mutation.error }
}

export function useSaveCollection<T>() {
  const { keypair } = useEncryption()
  const svc = useContract()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      patient,
      category,
      items,
    }: {
      patient: string
      category: RecordCategory
      items: T[]
    }) => {
      if (svc && keypair) {
        try {
          await saveCollection(patient, category, items, keypair, svc)
        } catch {
          localStorage.setItem(
            `hv_col_${patient.toLowerCase()}_${category}`,
            JSON.stringify(items),
          )
        }
      } else {
        localStorage.setItem(
          `hv_col_${patient.toLowerCase()}_${category}`,
          JSON.stringify(items),
        )
      }
    },
    onSuccess: (_, { patient, category }) => {
      queryClient.invalidateQueries({ queryKey: ['collection', patient, category] })
    },
  })

  return { save: mutation.mutateAsync, isSaving: mutation.isPending, saveError: mutation.error }
}
