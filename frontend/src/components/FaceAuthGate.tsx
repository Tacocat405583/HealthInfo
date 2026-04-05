/**
 * FaceAuthGate.tsx
 *
 * The main 2FA gate UI. Renders a different panel for each FaceAuthStatus,
 * with a camera preview shown whenever a live video stream is useful.
 *
 * Rendered by App.tsx in place of the main app content whenever the user
 * is connected but not yet fully authenticated (face + encryption keys).
 * Once both gates are passed, App.tsx swaps in the real app.
 */

import { useCallback, useRef, useState } from 'react'
import { useFaceAuth } from '../hooks/useFaceAuth'
import { useEncryption } from '../providers/EncryptionProvider'
import { FaceCameraPreview } from './FaceCameraPreview'
import { FaceAuthStatus } from '../types/faceAuth'
import { isPinataConfigured } from '../services/faceStore'

const CAMERA_ACTIVE_STATUSES: ReadonlyArray<FaceAuthStatus> = [
  FaceAuthStatus.NeedsEnrollment,
  FaceAuthStatus.CameraLoading,
  FaceAuthStatus.Enrolling,
  FaceAuthStatus.EncryptingAndUploading,
  FaceAuthStatus.AwaitingFaceVerify,
  FaceAuthStatus.Verifying,
]

export function FaceAuthGate() {
  const fa = useFaceAuth()
  const { isInitializing: keysInitializing, isReady: keysReady, initError } = useEncryption()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showManualCid, setShowManualCid] = useState(false)
  const [manualCidValue, setManualCidValue] = useState('')

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video
  }, [])
  const handleCameraError = useCallback((msg: string) => {
    setCameraError(msg)
  }, [])

  const handleEnroll = () => {
    if (!videoRef.current) {
      setCameraError('Camera not ready yet. Wait a moment and try again.')
      return
    }
    void fa.enrollFace(videoRef.current)
  }
  const handleVerify = () => {
    if (!videoRef.current) {
      setCameraError('Camera not ready yet. Wait a moment and try again.')
      return
    }
    void fa.verifyFace(videoRef.current)
  }
  const handleRecoverIPFS = () => void fa.recoverFromIPFS()
  const handleRecoverCID = () => {
    const trimmed = manualCidValue.trim()
    if (!trimmed) return
    void fa.recoverFromCID(trimmed)
    setShowManualCid(false)
    setManualCidValue('')
  }

  const cameraActive = CAMERA_ACTIVE_STATUSES.includes(fa.status)
  const pinataOk = isPinataConfigured()

  // Post-verification waiting on ECIES init
  const unlockingKeys = fa.isVerified && !keysReady

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="text-center max-w-md w-full">
        <h1 className="text-3xl font-bold">Face Authentication</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your face is a second factor. It never leaves this browser unencrypted.
        </p>

        {cameraActive && !cameraError && (
          <div className="mt-6 flex justify-center">
            <div className="relative">
              <FaceCameraPreview
                active={cameraActive}
                onReady={handleVideoReady}
                onError={handleCameraError}
              />

              {/* Countdown overlay — shown before capture starts */}
              {fa.countdownValue !== null && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                  <span
                    key={fa.countdownValue}
                    className="text-[7rem] font-bold text-white leading-none animate-pulse"
                  >
                    {fa.countdownValue}
                  </span>
                </div>
              )}

              {/* 5-dot progress ribbon — shown while samples are being captured */}
              {fa.countdownValue === null &&
                fa.captureProgress &&
                (fa.status === FaceAuthStatus.Enrolling ||
                  fa.status === FaceAuthStatus.Verifying) && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                    {Array.from({ length: fa.captureProgress.total }).map((_, i) => {
                      const filled = i < fa.captureProgress!.captured
                      return (
                        <div
                          key={i}
                          className={`h-3 w-3 rounded-full border border-white shadow ${
                            filled ? 'bg-green-400' : 'bg-white/30'
                          }`}
                        />
                      )
                    })}
                  </div>
                )}
            </div>
          </div>
        )}

        {cameraError && (
          <div className="mt-6 rounded bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {cameraError}
            <button
              onClick={() => setCameraError(null)}
              className="ml-2 underline font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Post-verification: ECIES unlock in progress ─────────────────── */}
        {unlockingKeys && (
          <div className="mt-6">
            <p className="text-sm text-green-600 font-semibold">
              Face matched{fa.lastMatchDistance !== null ? ` (distance ${fa.lastMatchDistance.toFixed(3)})` : ''}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {keysInitializing ? 'Unlocking your encrypted vault…' : 'Preparing encryption keys…'}
            </p>
            {initError && (
              <p className="mt-2 text-sm text-red-600">Key init failed: {initError}</p>
            )}
          </div>
        )}

        {/* ── Needs enrollment ────────────────────────────────────────────── */}
        {!unlockingKeys && fa.status === FaceAuthStatus.NeedsEnrollment && (
          <div className="mt-6">
            <p className="text-sm text-gray-600">
              First time on this device? Register your face below. We&apos;ll capture 5 samples,
              encrypt them with your wallet signature, and back them up to IPFS.
            </p>
            <button
              onClick={handleEnroll}
              disabled={!!cameraError}
              className="mt-4 w-full rounded bg-blue-600 px-6 py-3 text-white font-semibold disabled:opacity-50"
            >
              Register Face
            </button>
            {pinataOk && (
              <button
                onClick={handleRecoverIPFS}
                className="mt-2 w-full rounded border border-blue-600 px-6 py-3 text-blue-600 font-semibold hover:bg-blue-50"
              >
                Recover from IPFS
              </button>
            )}
            <button
              onClick={() => setShowManualCid(true)}
              className="mt-2 text-sm text-gray-500 underline"
            >
              Have a CID? Manual recovery
            </button>
          </div>
        )}

        {/* ── Camera loading / enrolling / uploading ──────────────────────── */}
        {fa.status === FaceAuthStatus.CameraLoading && (
          <p className="mt-6 text-sm text-gray-600">
            Loading face recognition models (~6 MB, first time only)…
          </p>
        )}
        {fa.status === FaceAuthStatus.Enrolling && (
          <div className="mt-6">
            {fa.countdownValue !== null ? (
              <p className="text-sm text-gray-600 font-semibold">
                Get ready — look straight at the camera
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600">Hold still — capturing samples</p>
                {fa.captureProgress && (
                  <p className="mt-1 text-3xl font-mono font-bold text-blue-600">
                    {fa.captureProgress.captured} / {fa.captureProgress.total}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {fa.status === FaceAuthStatus.EncryptingAndUploading && (
          <p className="mt-6 text-sm text-gray-600">
            Encrypting with your wallet signature and pinning to IPFS…
          </p>
        )}

        {/* ── Awaiting verify ─────────────────────────────────────────────── */}
        {!unlockingKeys && fa.status === FaceAuthStatus.AwaitingFaceVerify && (
          <div className="mt-6">
            <p className="text-sm text-gray-600">Look at the camera to verify your face.</p>
            <p className="mt-1 text-xs text-gray-500">
              Please make sure your face is fully visible before logging in.
            </p>
            <button
              onClick={handleVerify}
              disabled={!!cameraError}
              className="mt-4 w-full rounded bg-blue-600 px-6 py-3 text-white font-semibold disabled:opacity-50"
            >
              Verify Face
            </button>
            {fa.lastError && (
              <p className="mt-3 text-sm text-amber-700">{fa.lastError}</p>
            )}
            {fa.lastEnrollmentCid && (
              <div className="mt-4 rounded bg-blue-50 border border-blue-200 p-3 text-xs text-left">
                <p className="font-semibold text-blue-900">Enrollment complete</p>
                <p className="mt-1 text-blue-800">
                  Backup CID: <code className="font-mono break-all">{fa.lastEnrollmentCid}</code>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Verifying ───────────────────────────────────────────────────── */}
        {fa.status === FaceAuthStatus.Verifying && (
          <div className="mt-6">
            {fa.countdownValue !== null ? (
              <p className="text-sm text-gray-600 font-semibold">
                Get ready — we&apos;re checking it&apos;s you
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600">Matching your face…</p>
                {fa.captureProgress && (
                  <p className="mt-1 text-3xl font-mono font-bold text-blue-600">
                    {fa.captureProgress.captured} / {fa.captureProgress.total}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Locked ──────────────────────────────────────────────────────── */}
        {fa.status === FaceAuthStatus.Locked && (
          <div className="mt-6 rounded bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700 font-semibold">{fa.lastError}</p>
            {fa.lockoutUntil && (
              <p className="mt-2 text-xs text-red-600">
                Auto-unlock at {new Date(fa.lockoutUntil).toLocaleTimeString()}
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {pinataOk && (
                <button
                  onClick={handleRecoverIPFS}
                  className="rounded border border-red-600 px-4 py-2 text-sm text-red-700 font-semibold hover:bg-red-100"
                >
                  Recover from IPFS
                </button>
              )}
              {/* Debug bypass — gated on both dev build AND exact ?dev=true param.
                  Using URLSearchParams avoids substring false matches (e.g. ?nodev=true
                  would previously hit `includes('dev=true')`) and import.meta.env.DEV
                  ensures a production bundle can never render this button even if a
                  user crafts the query string manually (defeats anti-brute-force). */}
              {typeof window !== 'undefined' &&
                import.meta.env.DEV &&
                new URLSearchParams(window.location.search).get('dev') === 'true' && (
                  <button
                    onClick={fa.unlock}
                    className="text-xs text-red-600 underline"
                  >
                    Skip cooldown (debug)
                  </button>
                )}
            </div>
          </div>
        )}

        {/* ── Recovery in progress ────────────────────────────────────────── */}
        {fa.status === FaceAuthStatus.Recovery && (
          <p className="mt-6 text-sm text-gray-600">Fetching your backup from IPFS…</p>
        )}

        {/* ── Manual CID recovery modal (inline) ──────────────────────────── */}
        {showManualCid && (
          <div className="mt-6 rounded bg-gray-50 border border-gray-300 p-4 text-left">
            <p className="text-sm font-semibold text-gray-700">Manual recovery</p>
            <p className="mt-1 text-xs text-gray-500">
              Paste the CID you saved at enrollment time.
            </p>
            <input
              type="text"
              value={manualCidValue}
              onChange={(e) => setManualCidValue(e.target.value)}
              placeholder="bafy..."
              aria-label="IPFS CID for face recovery"
              className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRecoverCID}
                disabled={!manualCidValue.trim()}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm text-white font-semibold disabled:opacity-50"
              >
                Recover
              </button>
              <button
                onClick={() => {
                  setShowManualCid(false)
                  setManualCidValue('')
                }}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Debug: reset face (only show with ?dev=true in dev build) ─── */}
        {typeof window !== 'undefined' &&
          import.meta.env.DEV &&
          new URLSearchParams(window.location.search).get('dev') === 'true' &&
          fa.status !== FaceAuthStatus.Idle && (
            <button
              onClick={() => void fa.resetFace()}
              className="mt-6 text-xs text-gray-400 underline"
            >
              [dev] Reset face enrollment
            </button>
          )}
      </div>
    </div>
  )
}
