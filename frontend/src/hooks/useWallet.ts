/**
 * useWallet.ts
 *
 * Convenience hook combining wallet connection state.
 * Thin wrapper over useWeb3() with derived helpers.
 *
 * Usage:
 *   const { isConnected, shortAddress, connect, disconnect, wrongNetwork } = useWallet()
 */

import { useWeb3 } from '../providers/Web3Provider'

const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 31337)

export function useWallet() {
  const web3 = useWeb3()

  const shortAddress = web3.address
    ? `${web3.address.slice(0, 6)}…${web3.address.slice(-4)}`
    : null

  const isConnected = Boolean(web3.address)
  const wrongNetwork = isConnected && web3.chainId !== EXPECTED_CHAIN_ID

  /** Request MetaMask to switch to the expected network. */
  async function switchNetwork() {
    const ethereum = (window as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
    if (!ethereum) return
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      })
    } catch {
      // If the chain isn't added, user needs to add it manually
    }
  }

  return {
    ...web3,
    isConnected,
    shortAddress,
    wrongNetwork,
    expectedChainId: EXPECTED_CHAIN_ID,
    switchNetwork,
  }
}
