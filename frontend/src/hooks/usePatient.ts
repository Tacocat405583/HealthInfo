/**
 * usePatient.ts
 *
 * Patient registration state and actions.
 *
 * Usage:
 *   const { isRegistered, isLoading, register, isRegistering } = usePatient()
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWeb3 } from '../providers/Web3Provider'
import { useEncryption } from '../providers/EncryptionProvider'
import { useContract } from './useContract'

export function usePatient(patientAddress?: string) {
  const { address } = useWeb3()
  const { publicKeyHex, initKeys, isReady: keysReady } = useEncryption()
  const svc = useContract()
  const queryClient = useQueryClient()

  const targetAddress = patientAddress ?? address ?? ''

  const registrationQuery = useQuery({
    queryKey: ['patient', 'registered', targetAddress],
    queryFn: () => svc!.isPatientRegistered(targetAddress),
    enabled: Boolean(svc && targetAddress),
  })

  const publicKeyQuery = useQuery({
    queryKey: ['patient', 'publicKey', targetAddress],
    queryFn: () => svc!.getPatientPublicKey(targetAddress),
    enabled: Boolean(svc && targetAddress && registrationQuery.data),
  })

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!svc) throw new Error('Wallet not connected')
      if (!publicKeyHex) throw new Error('Encryption keys not initialized — call initKeys() first')

      const tx = await svc.registerPatient(publicKeyHex)
      await tx.wait()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'registered', targetAddress] })
      queryClient.invalidateQueries({ queryKey: ['patient', 'publicKey', targetAddress] })
    },
  })

  return {
    /** True if the target address is registered as a patient */
    isRegistered: registrationQuery.data ?? false,
    /** The patient's on-chain ECIES public key */
    onChainPublicKey: publicKeyQuery.data ?? null,
    isLoading: registrationQuery.isLoading,
    /** Register as a patient. Must call initKeys() first. */
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    /** True if the ECIES keypair has been initialized for this session */
    keysReady,
    /** Call this to initialize ECIES keys (prompts MetaMask signature) */
    initKeys,
  }
}

/**
 * useProviderRegistration — similar hook for provider registration.
 */
export function useProviderRegistration() {
  const { address } = useWeb3()
  const { publicKeyHex, initKeys, isReady: keysReady } = useEncryption()
  const svc = useContract()
  const queryClient = useQueryClient()

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!svc) throw new Error('Wallet not connected')
      if (!publicKeyHex) throw new Error('Encryption keys not initialized — call initKeys() first')

      const tx = await svc.registerProvider(publicKeyHex)
      await tx.wait()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'publicKey', address] })
    },
  })

  return {
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    keysReady,
    initKeys,
  }
}
