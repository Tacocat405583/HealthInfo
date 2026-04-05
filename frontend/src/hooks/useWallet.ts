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

/** Known network params for wallet_addEthereumChain */
const HARDHAT_NETWORK_PARAMS: Record<number, object> = {
  31337: {
    chainId: '0x7a69',
    chainName: 'Hardhat Local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
  },
  11155111: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
}

export function useWallet() {
  const web3 = useWeb3()

  const shortAddress = web3.address
    ? `${web3.address.slice(0, 6)}…${web3.address.slice(-4)}`
    : null

  const isConnected = Boolean(web3.address)
  // When VITE_CHAIN_ID=0, bypass the network check — useful for face-auth
  // smoke tests where you just need a signer and don't care which chain
  // MetaMask is on. Gated by import.meta.env.DEV so a stray VITE_CHAIN_ID=0
  // in a production build can NEVER silently disable the network check
  // (would otherwise let users interact with contracts on the wrong chain).
  const bypassNetworkCheck = EXPECTED_CHAIN_ID === 0 && import.meta.env.DEV
  const wrongNetwork =
    !bypassNetworkCheck && isConnected && web3.chainId !== EXPECTED_CHAIN_ID

  /** Request MetaMask to switch to the expected network, adding it first if needed. */
  async function switchNetwork() {
    const ethereum = (window as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
    if (!ethereum) return
    const chainIdHex = `0x${EXPECTED_CHAIN_ID.toString(16)}`
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
    } catch (err) {
      // Error 4902 = chain not added to MetaMask yet — add it automatically
      if ((err as { code?: number }).code === 4902) {
        const params = HARDHAT_NETWORK_PARAMS[EXPECTED_CHAIN_ID]
        if (params) {
          await ethereum.request({ method: 'wallet_addEthereumChain', params: [params] })
        }
      }
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
