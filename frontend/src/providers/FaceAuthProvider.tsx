/**
 * FaceAuthProvider.tsx
 *
 * 2FA gate provider. Sits between Web3Provider and EncryptionProvider in
 * the stack: EncryptionProvider.initKeys() refuses to run until
 * useFaceAuth().isVerified is true.
 *
 * State machine (see types/faceAuth.ts for the enum):
 *
 *   Idle
 *    → WalletReady  (address appears)
 *    → NeedsEnrollment | AwaitingFaceVerify  (based on local IndexedDB)
 *    → CameraLoading → Enrolling → EncryptingAndUploading → Verified
 *        or
 *    → CameraLoading → Verifying → Verified | verify_failed (retry or lock)
 *    → Locked → Recovery → AwaitingFaceVerify
 *
 * CRITICAL: The raw Float32Array descriptor never enters React state —
 * it lives only in a useRef so React DevTools cannot inspect it. Only
 * status enums, booleans, and error strings are observable.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { useWeb3 } from './Web3Provider'
import {
  captureDescriptor,
  loadFaceModels,
  matchDescriptor,
  VERIFICATION_SAMPLES,
} from '../services/faceAuth'
import {
  decryptDescriptor,
  encryptDescriptor,
  isPinataConfigured,
  loadFaceLocal,
  lookupFaceCID,
  recoverFaceFromCID as recoverFromCIDService,
  removeFaceLocal,
  saveFaceLocal,
  uploadFaceToIPFS,
} from '../services/faceStore'
import { keyDerivationMessage } from '../services/encryption'
import {
  forgetSignature,
  rememberSignature,
} from '../services/sessionCache'
import { FaceAuthStatus } from '../types/faceAuth'

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_VERIFY_FAILURES = 3
// Shortened from 60s → 10s for demo purposes. Production should use 60s+
// to meaningfully deter brute-force attempts on face verification.
const LOCKOUT_DURATION_MS = 10_000

/** 3-2-1 countdown tick length in ms — purely for demo UX. */
const COUNTDOWN_TICK_MS = 900
const COUNTDOWN_FROM = 3

async function runCountdown(onTick: (n: number) => void): Promise<void> {
  for (let n = COUNTDOWN_FROM; n >= 1; n--) {
    onTick(n)
    await new Promise<void>((resolve) => setTimeout(resolve, COUNTDOWN_TICK_MS))
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

interface FaceAuthState {
  status: FaceAuthStatus
  isVerified: boolean
  failureCount: number
  lastError: string | null
  lastEnrollmentCid: string | null
  lastMatchDistance: number | null
  lockoutUntil: number | null
  captureProgress: { captured: number; total: number } | null
  /** 3-2-1 countdown before capturing; null when not counting down. */
  countdownValue: number | null
}

const initialState: FaceAuthState = {
  status: FaceAuthStatus.Idle,
  isVerified: false,
  failureCount: 0,
  lastError: null,
  lastEnrollmentCid: null,
  lastMatchDistance: null,
  lockoutUntil: null,
  captureProgress: null,
  countdownValue: null,
}

type Action =
  | { type: 'wallet_connected'; hasLocal: boolean }
  | { type: 'wallet_disconnected' }
  | { type: 'camera_loading' }
  | { type: 'countdown'; value: number | null }
  | { type: 'enrolling' }
  | { type: 'progress'; captured: number; total: number }
  | { type: 'encrypting_uploading' }
  | { type: 'enrolled'; cid: string }
  | { type: 'awaiting_verify' }
  | { type: 'verifying' }
  | { type: 'verified'; distance: number }
  | { type: 'verify_failed'; distance: number }
  | { type: 'unlock' }
  | { type: 'recovery_start' }
  | { type: 'recovery_done' }
  | { type: 'error'; message: string; fallbackStatus?: FaceAuthStatus }
  | { type: 'reset' }

function reducer(state: FaceAuthState, action: Action): FaceAuthState {
  switch (action.type) {
    case 'wallet_connected':
      return {
        ...initialState,
        status: action.hasLocal
          ? FaceAuthStatus.AwaitingFaceVerify
          : FaceAuthStatus.NeedsEnrollment,
      }
    case 'wallet_disconnected':
      return initialState
    case 'camera_loading':
      return { ...state, status: FaceAuthStatus.CameraLoading, lastError: null }
    case 'countdown':
      return { ...state, countdownValue: action.value }
    case 'enrolling':
      return {
        ...state,
        status: FaceAuthStatus.Enrolling,
        lastError: null,
        captureProgress: null,
      }
    case 'progress':
      return {
        ...state,
        captureProgress: { captured: action.captured, total: action.total },
      }
    case 'encrypting_uploading':
      return {
        ...state,
        status: FaceAuthStatus.EncryptingAndUploading,
        lastError: null,
        captureProgress: null,
      }
    case 'enrolled':
      return {
        ...state,
        status: FaceAuthStatus.AwaitingFaceVerify,
        lastEnrollmentCid: action.cid,
        lastError: null,
      }
    case 'awaiting_verify':
      return { ...state, status: FaceAuthStatus.AwaitingFaceVerify, lastError: null }
    case 'verifying':
      return { ...state, status: FaceAuthStatus.Verifying, lastError: null }
    case 'verified':
      return {
        ...state,
        status: FaceAuthStatus.Verified,
        isVerified: true,
        failureCount: 0,
        lastMatchDistance: action.distance,
        lastError: null,
        lockoutUntil: null,
      }
    case 'verify_failed': {
      const nextCount = state.failureCount + 1
      if (nextCount >= MAX_VERIFY_FAILURES) {
        const lockoutSeconds = Math.round(LOCKOUT_DURATION_MS / 1000)
        return {
          ...state,
          status: FaceAuthStatus.Locked,
          failureCount: nextCount,
          lastMatchDistance: action.distance,
          lastError: `Face did not match ${nextCount} times. Locked for ${lockoutSeconds} seconds.`,
          lockoutUntil: Date.now() + LOCKOUT_DURATION_MS,
        }
      }
      return {
        ...state,
        status: FaceAuthStatus.AwaitingFaceVerify,
        failureCount: nextCount,
        lastMatchDistance: action.distance,
        lastError: `Face did not match (${nextCount}/${MAX_VERIFY_FAILURES}). Try again with better lighting.`,
      }
    }
    case 'unlock':
      return {
        ...state,
        status: FaceAuthStatus.AwaitingFaceVerify,
        failureCount: 0,
        lockoutUntil: null,
        lastError: null,
      }
    case 'recovery_start':
      return { ...state, status: FaceAuthStatus.Recovery, lastError: null }
    case 'recovery_done':
      return { ...state, status: FaceAuthStatus.AwaitingFaceVerify, lastError: null }
    case 'error':
      return {
        ...state,
        status: action.fallbackStatus ?? state.status,
        lastError: action.message,
      }
    case 'reset':
      return initialState
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface FaceAuthContextValue extends FaceAuthState {
  /** Enroll a new face. Captures 5 frames, averages, encrypts, pins to IPFS, caches locally. */
  enrollFace: (video: HTMLVideoElement) => Promise<void>
  /** Verify the live face against the stored descriptor. */
  verifyFace: (video: HTMLVideoElement) => Promise<void>
  /** Try to auto-recover from Pinata using the deterministic filename. */
  recoverFromIPFS: () => Promise<void>
  /** Manual recovery: user pastes a CID they saved at enrollment. */
  recoverFromCID: (cid: string) => Promise<void>
  /** Wipe local face data — forces re-enrollment on next login. Debug only. */
  resetFace: () => Promise<void>
  /** Manual unlock after the 60s cooldown. */
  unlock: () => void
}

const FaceAuthContext = createContext<FaceAuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FaceAuthProvider({ children }: { children: React.ReactNode }) {
  const { address, signer } = useWeb3()
  const [state, dispatch] = useReducer(reducer, initialState)

  /**
   * The raw descriptor is sensitive biometric data — keep it out of React
   * state so it never appears in DevTools. Ref is cleared on wallet change.
   */
  const descriptorRef = useRef<Float32Array | null>(null)

  // ── Wallet lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!address) {
      descriptorRef.current = null
      forgetSignature()
      dispatch({ type: 'wallet_disconnected' })
      return
    }
    // Account switched — drop any cached sig tied to the old address
    forgetSignature()
    let cancelled = false
    loadFaceLocal(address).then((record) => {
      if (cancelled) return
      dispatch({ type: 'wallet_connected', hasLocal: record !== null })
    })
    return () => {
      cancelled = true
    }
  }, [address])

  // ── Auto-unlock after cooldown ──────────────────────────────────────────────
  useEffect(() => {
    if (state.status !== FaceAuthStatus.Locked || !state.lockoutUntil) return
    const remaining = state.lockoutUntil - Date.now()
    if (remaining <= 0) {
      dispatch({ type: 'unlock' })
      return
    }
    const timer = setTimeout(() => dispatch({ type: 'unlock' }), remaining)
    return () => clearTimeout(timer)
  }, [state.status, state.lockoutUntil])

  // ── Enroll ──────────────────────────────────────────────────────────────────
  const enrollFace = useCallback(
    async (video: HTMLVideoElement) => {
      if (!address || !signer) {
        dispatch({ type: 'error', message: 'Wallet not connected' })
        return
      }
      try {
        dispatch({ type: 'camera_loading' })
        await loadFaceModels()

        dispatch({ type: 'enrolling' })
        await runCountdown((n) => dispatch({ type: 'countdown', value: n }))
        dispatch({ type: 'countdown', value: null })

        const descriptor = await captureDescriptor(video, undefined, (c, t) =>
          dispatch({ type: 'progress', captured: c, total: t }),
        )

        dispatch({ type: 'encrypting_uploading' })
        const signature = await signer.signMessage(keyDerivationMessage(address))
        rememberSignature(address, signature)
        const encrypted = await encryptDescriptor(descriptor, signature)

        let cid: string
        try {
          cid = await uploadFaceToIPFS(encrypted, address)
        } catch (ipfsErr) {
          console.warn('[FaceAuth] IPFS upload failed, enrolling local-only', ipfsErr)
          cid = '' // degraded mode — no cross-device recovery
        }

        await saveFaceLocal(address, encrypted, cid)
        descriptorRef.current = descriptor

        dispatch({ type: 'enrolled', cid })
        // First enrollment is self-verifying: the captured face IS the stored face.
        // Skip the redundant second camera pass and go straight to Verified.
        dispatch({ type: 'verified', distance: 0 })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Enrollment failed'
        dispatch({
          type: 'error',
          message: msg,
          fallbackStatus: FaceAuthStatus.NeedsEnrollment,
        })
      }
    },
    [address, signer],
  )

  // ── Verify ──────────────────────────────────────────────────────────────────
  const verifyFace = useCallback(
    async (video: HTMLVideoElement) => {
      if (!address || !signer) {
        dispatch({ type: 'error', message: 'Wallet not connected' })
        return
      }
      if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
        // UI should prevent this, but defend anyway
        return
      }

      try {
        dispatch({ type: 'camera_loading' })
        await loadFaceModels()

        // Load stored descriptor on demand (first verify after page load)
        let stored = descriptorRef.current
        if (!stored) {
          const local = await loadFaceLocal(address)
          if (!local) {
            dispatch({
              type: 'error',
              message: 'No enrolled face on this device. Try recovery or re-enroll.',
              fallbackStatus: FaceAuthStatus.NeedsEnrollment,
            })
            return
          }
          const signature = await signer.signMessage(keyDerivationMessage(address))
          rememberSignature(address, signature)
          stored = await decryptDescriptor(local.encryptedBlob, signature)
          descriptorRef.current = stored
        }

        dispatch({ type: 'verifying' })
        await runCountdown((n) => dispatch({ type: 'countdown', value: n }))
        dispatch({ type: 'countdown', value: null })

        // Verification uses fewer samples than enrollment (speed > baseline
        // quality for a one-shot comparison).
        const live = await captureDescriptor(video, VERIFICATION_SAMPLES, (c, t) =>
          dispatch({ type: 'progress', captured: c, total: t }),
        )
        const { distance, match } = matchDescriptor(stored, live)
        console.info(`[FaceAuth] match distance = ${distance.toFixed(3)}`)

        if (match) {
          dispatch({ type: 'verified', distance })
        } else {
          dispatch({ type: 'verify_failed', distance })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Verification failed'
        dispatch({
          type: 'error',
          message: msg,
          fallbackStatus: FaceAuthStatus.AwaitingFaceVerify,
        })
      }
    },
    [address, signer, state.lockoutUntil],
  )

  // ── Recovery: auto via Pinata ───────────────────────────────────────────────
  const recoverFromIPFS = useCallback(async () => {
    if (!address || !signer) {
      dispatch({ type: 'error', message: 'Wallet not connected' })
      return
    }
    if (!isPinataConfigured()) {
      dispatch({
        type: 'error',
        message:
          'Pinata not configured. Use manual CID recovery, or enroll a new face.',
        fallbackStatus: FaceAuthStatus.NeedsEnrollment,
      })
      return
    }
    try {
      dispatch({ type: 'recovery_start' })
      const cid = await lookupFaceCID(address)
      if (!cid) {
        dispatch({
          type: 'error',
          message:
            'No backup found on IPFS for this wallet. Use manual CID recovery or enroll a new face.',
          fallbackStatus: FaceAuthStatus.NeedsEnrollment,
        })
        return
      }
      // Only prompt to sign once we know a backup exists
      const signature = await signer.signMessage(keyDerivationMessage(address))
      rememberSignature(address, signature)
      const result = await recoverFromCIDService(cid, signature)
      await saveFaceLocal(address, result.encryptedBlob, result.cid)
      descriptorRef.current = result.descriptor
      dispatch({ type: 'recovery_done' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'IPFS recovery failed'
      dispatch({
        type: 'error',
        message: msg,
        fallbackStatus: FaceAuthStatus.NeedsEnrollment,
      })
    }
  }, [address, signer])

  // ── Recovery: manual CID ────────────────────────────────────────────────────
  const recoverFromCID = useCallback(
    async (cid: string) => {
      if (!address || !signer) {
        dispatch({ type: 'error', message: 'Wallet not connected' })
        return
      }
      try {
        dispatch({ type: 'recovery_start' })
        const signature = await signer.signMessage(keyDerivationMessage(address))
        rememberSignature(address, signature)
        const result = await recoverFromCIDService(cid.trim(), signature)
        await saveFaceLocal(address, result.encryptedBlob, result.cid)
        descriptorRef.current = result.descriptor
        dispatch({ type: 'recovery_done' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Manual recovery failed'
        dispatch({
          type: 'error',
          message: msg,
          fallbackStatus: FaceAuthStatus.NeedsEnrollment,
        })
      }
    },
    [address, signer],
  )

  // ── Reset (debug) ───────────────────────────────────────────────────────────
  const resetFace = useCallback(async () => {
    if (!address) return
    await removeFaceLocal(address)
    descriptorRef.current = null
    dispatch({ type: 'reset' })
    dispatch({ type: 'wallet_connected', hasLocal: false })
  }, [address])

  const unlock = useCallback(() => {
    // Enforce cooldown even on manual unlock — prevents console.ctx.unlock()
    // and the debug button (when enabled) from bypassing the timer entirely.
    if (state.lockoutUntil && Date.now() < state.lockoutUntil) return
    dispatch({ type: 'unlock' })
  }, [state.lockoutUntil])

  return (
    <FaceAuthContext.Provider
      value={{
        ...state,
        enrollFace,
        verifyFace,
        recoverFromIPFS,
        recoverFromCID,
        resetFace,
        unlock,
      }}
    >
      {children}
    </FaceAuthContext.Provider>
  )
}

export function useFaceAuthContext(): FaceAuthContextValue {
  const ctx = useContext(FaceAuthContext)
  if (!ctx) {
    throw new Error(
      'useFaceAuth (useFaceAuthContext) must be used within <FaceAuthProvider>',
    )
  }
  return ctx
}
