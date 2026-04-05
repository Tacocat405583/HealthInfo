/**
 * EncryptionProvider.tsx
 *
 * Manages the user's ECIES keypair for the session.
 *
 * Flow:
 *  1. User connects MetaMask (Web3Provider)
 *  2. Check IndexedDB — if key is cached, load it (no re-sign needed)
 *  3. If not cached, call initKeys() to prompt MetaMask signature → derive keypair
 *  4. Save encrypted private key to IndexedDB for future sessions
 *
 * Usage:
 *   const { keypair, publicKeyHex, initKeys, isReady } = useEncryption()
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  deriveKeypairFromSignature,
  keyDerivationMessage,
} from '../services/encryption'
import {
  hasStoredKey,
  loadPrivateKey,
  savePrivateKey,
  removePrivateKey,
} from '../services/keystore'
import { recallSignature, rememberSignature } from '../services/sessionCache'
import { secp256k1 } from '@noble/curves/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'
import { useWeb3 } from './Web3Provider'
import { useFaceAuthContext } from './FaceAuthProvider'
import type { ECIESKeypair } from '../types/crypto'

interface EncryptionState {
  /** The ECIES keypair for the current session. Null until initKeys() succeeds. */
  keypair: ECIESKeypair | null
  /** Hex-encoded public key — post this on-chain during registration */
  publicKeyHex: string | null
  /** True after initKeys() has successfully loaded the keypair */
  isReady: boolean
  /** True while the MetaMask signature prompt is pending */
  isInitializing: boolean
  /** Error from last initKeys() attempt */
  initError: string | null
  /**
   * Initialize the ECIES keypair for the connected wallet.
   * Prompts MetaMask to sign a deterministic message, then derives the keypair.
   * Stores the encrypted private key in IndexedDB.
   */
  initKeys: () => Promise<void>
  /** Clear the keypair from memory and remove it from IndexedDB. */
  clearKeys: () => Promise<void>
}

const EncryptionContext = createContext<EncryptionState | null>(null)

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const { address, signer } = useWeb3()
  const { isVerified: faceVerified } = useFaceAuthContext()
  const [keypair, setKeypair] = useState<ECIESKeypair | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  /** Guard against a StrictMode double-invoke of the auto-init effect. */
  const initLockRef = useRef(false)

  // When the wallet address changes, clear the old keypair
  useEffect(() => {
    if (!address || !signer) {
      setKeypair(null)
      initLockRef.current = false
      return
    }

    // We can't auto-load from IndexedDB without a signature. Wait for the
    // user to pass face auth — initKeys will then fire automatically via
    // the effect below, reusing the signature that FaceAuthProvider already
    // obtained during face verification.
    hasStoredKey(address) // fire-and-forget, just for parity with old behavior
  }, [address, signer])

  const initKeys = useCallback(async () => {
    if (!address || !signer) {
      setInitError('Wallet not connected')
      return
    }
    if (!faceVerified) {
      setInitError('Face verification required before unlocking encryption keys')
      return
    }

    setIsInitializing(true)
    setInitError(null)

    try {
      const message = keyDerivationMessage(address)

      let signature = recallSignature(address)
      if (!signature) {
        signature = await signer.signMessage(message)
        rememberSignature(address, signature)
      }
      const kp = deriveKeypairFromSignature(signature)

      // Try to load from IndexedDB first (avoids generating a new keypair)
      const stored = await loadPrivateKey(address, signature)
      if (stored) {
        // Verify the stored key matches the derived key
        const storedPubKey = secp256k1.getPublicKey(stored, true)
        const storedPubKeyHex = '0x' + bytesToHex(storedPubKey)
        if (storedPubKeyHex === kp.publicKeyHex) {
          setKeypair({ privateKey: stored, publicKey: storedPubKey, publicKeyHex: storedPubKeyHex })
          return
        }
      }

      // Derive fresh keypair and store it
      await savePrivateKey(address, kp.privateKey, signature)
      setKeypair(kp)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Key initialization failed'
      setInitError(msg)
    } finally {
      setIsInitializing(false)
    }
  }, [address, signer, faceVerified])

  // Auto-init the ECIES keypair the moment face verification succeeds.
  // initLockRef prevents StrictMode's double-invoke from firing two
  // signMessage prompts in development.
  useEffect(() => {
    if (!faceVerified || keypair || isInitializing || initLockRef.current) return
    initLockRef.current = true
    void initKeys().finally(() => {
      initLockRef.current = false
    })
  }, [faceVerified, keypair, isInitializing, initKeys])

  const clearKeys = useCallback(async () => {
    if (address) {
      await removePrivateKey(address)
    }
    setKeypair(null)
  }, [address])

  return (
    <EncryptionContext.Provider
      value={{
        keypair,
        publicKeyHex: keypair?.publicKeyHex ?? null,
        isReady: keypair !== null,
        isInitializing,
        initError,
        initKeys,
        clearKeys,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption(): EncryptionState {
  const ctx = useContext(EncryptionContext)
  if (!ctx) throw new Error('useEncryption must be used within <EncryptionProvider>')
  return ctx
}
