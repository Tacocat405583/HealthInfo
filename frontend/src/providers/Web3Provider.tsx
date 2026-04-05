/**
 * Web3Provider.tsx
 *
 * MetaMask connection + ethers.js BrowserProvider context.
 * Handles account changes, network changes, and disconnects.
 *
 * Usage:
 *   const { address, chainId, signer, provider, connect, disconnect, isConnecting } = useWeb3()
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ethers } from 'ethers'

interface Web3State {
  /** Connected wallet address, or null */
  address: string | null
  /** Current chain ID, or null */
  chainId: number | null
  /** ethers Signer (write operations) */
  signer: ethers.JsonRpcSigner | null
  /** ethers BrowserProvider */
  provider: ethers.BrowserProvider | null
  /** True while MetaMask is prompting */
  isConnecting: boolean
  /** Error from last connection attempt */
  connectError: string | null
  /** Connect MetaMask */
  connect: () => Promise<void>
  /** Disconnect (clears local state; MetaMask doesn't support true disconnect) */
  disconnect: () => void
}

const Web3Context = createContext<Web3State | null>(null)

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const initProvider = useCallback(async () => {
    const ethereum = (window as { ethereum?: ethers.Eip1193Provider }).ethereum
    if (!ethereum) return undefined

    // Wrap the full init sequence: any of these can reject (user rejection,
    // RPC timeout) and an unhandled rejection here would otherwise escape all
    // the way to window.onunhandledrejection.
    try {
      const bp = new ethers.BrowserProvider(ethereum)
      setProvider(bp)

      const network = await bp.getNetwork()
      setChainId(Number(network.chainId))

      const accounts = await bp.listAccounts()
      if (accounts.length > 0) {
        setSigner(accounts[0])
        setAddress(accounts[0].address)
      }

      return bp
    } catch (err) {
      console.error('Failed to initialize Web3 provider:', err)
      return undefined
    }
  }, [])

  useEffect(() => {
    initProvider()
  }, [initProvider])

  // Listen for MetaMask account / network changes
  useEffect(() => {
    const ethereum = (window as { ethereum?: { on: (...a: unknown[]) => void; removeListener: (...a: unknown[]) => void } }).ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null)
        setSigner(null)
      } else {
        // Let initProvider be the single source of truth for address+signer,
        // so we don't race: a direct setAddress(accounts[0]) here followed by
        // an async initProvider() left a window where signer still pointed at
        // the previous account.
        void initProvider()
      }
    }

    const handleChainChanged = () => {
      // Safest approach: reload
      window.location.reload()
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [initProvider])

  const connect = useCallback(async () => {
    const ethereum = (window as { ethereum?: ethers.Eip1193Provider }).ethereum
    if (!ethereum) {
      setConnectError('MetaMask not found. Please install the MetaMask extension.')
      return
    }

    setIsConnecting(true)
    setConnectError(null)

    try {
      const bp = new ethers.BrowserProvider(ethereum)
      await bp.send('eth_requestAccounts', [])
      const signerInstance = await bp.getSigner()
      const network = await bp.getNetwork()

      setProvider(bp)
      setSigner(signerInstance)
      setAddress(signerInstance.address)
      setChainId(Number(network.chainId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setConnectError(msg)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setSigner(null)
    setChainId(null)
  }, [])

  return (
    <Web3Context.Provider
      value={{ address, chainId, signer, provider, isConnecting, connectError, connect, disconnect }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3(): Web3State {
  const ctx = useContext(Web3Context)
  if (!ctx) throw new Error('useWeb3 must be used within <Web3Provider>')
  return ctx
}
