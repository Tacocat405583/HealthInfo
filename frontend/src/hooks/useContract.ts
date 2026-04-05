/**
 * useContract.ts
 *
 * Returns a HealthVaultService instance for the connected wallet and chain.
 * Returns null when no chainId is available yet (e.g., wallet not connected).
 * NOTE: chain support is enforced at the `getContractAddress` call inside
 * `createHealthVaultService`, which throws for unknown chains — if you need a
 * soft "unsupported chain" fallback, guard the caller side explicitly.
 *
 * Usage:
 *   const svc = useContract()
 *   if (!svc) return <ConnectWalletPrompt />
 *   await svc.registerPatient(publicKeyHex)
 */

import { useMemo } from 'react'
import { useWeb3 } from '../providers/Web3Provider'
import { createHealthVaultService, HealthVaultService } from '../services/contract'
import { getContractAddress } from '../contracts/addresses'

export function useContract(): HealthVaultService | null {
  const { signer, provider, chainId } = useWeb3()

  return useMemo(() => {
    if (!chainId) return null
    if (!getContractAddress(chainId)) return null   // unsupported / unconfigured chain
    if (signer) return createHealthVaultService(signer, chainId)
    if (provider) return createHealthVaultService(provider, chainId)
    return null
  }, [signer, provider, chainId])
}
