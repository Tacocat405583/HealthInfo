/**
 * useContract.ts
 *
 * Returns a HealthVaultService instance for the connected wallet and chain.
 * Returns null if the wallet is not connected or the chain is not supported.
 *
 * Usage:
 *   const svc = useContract()
 *   if (!svc) return <ConnectWalletPrompt />
 *   await svc.registerPatient(publicKeyHex)
 */

import { useMemo } from 'react'
import { useWeb3 } from '../providers/Web3Provider'
import { createHealthVaultService, HealthVaultService } from '../services/contract'

export function useContract(): HealthVaultService | null {
  const { signer, provider, chainId } = useWeb3()

  return useMemo(() => {
    if (!chainId) return null
    if (signer) return createHealthVaultService(signer, chainId)
    if (provider) return createHealthVaultService(provider, chainId)
    return null
  }, [signer, provider, chainId])
}
