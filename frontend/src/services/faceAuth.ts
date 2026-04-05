/**
 * faceAuth.ts
 *
 * Thin wrapper around @vladmandic/face-api for the 2FA login flow.
 *
 * Responsibilities:
 *  - Lazy-load the three face-api.js model nets (memoized, StrictMode-safe)
 *  - Capture N descriptors from a live <video> and average them
 *  - Compare two descriptors via euclidean distance
 *  - Serialize / deserialize 128-dim Float32Array descriptors for storage
 *
 * NOT responsible for:
 *  - Encryption (see faceStore.ts)
 *  - Persistence (see faceStore.ts)
 *  - UI / state machine (see FaceAuthProvider.tsx)
 *
 * Design note on the threshold:
 *   face-api.js ships 0.6 as the default "same person" cutoff. For a 2FA
 *   gate we err on the side of false-reject, so we use 0.5. Tighten further
 *   in production if impersonation is a concern; loosen if the demo fails
 *   on real users in real lighting.
 */

import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = '/models'

/** Euclidean distance cutoff for "same person". Stricter than default 0.6. */
export const FACE_MATCH_THRESHOLD = 0.5

/** Number of frames averaged during enrollment to smooth out noise.
 *  Higher = better baseline quality, but longer wait. */
export const ENROLLMENT_SAMPLES = 5

/** Number of frames averaged during verification.
 *  Lower than enrollment because we only need "good enough" for a single
 *  distance comparison, and login speed matters more than baseline quality. */
export const VERIFICATION_SAMPLES = 3

/**
 * Delay inserted between successful sample captures. Purely for demo UX —
 * without this, capturing 5 samples finishes in ~300 ms and the user sees
 * the progress counter flash from 0 straight to 5. 500 ms gives each
 * "captured X/5" step enough time to render visibly.
 */
export const CAPTURE_DELAY_MS = 500

/** How long to wait for enough face frames before giving up. */
const CAPTURE_TIMEOUT_MS = 15_000

/** Delay between detection attempts when no face is found. */
const RETRY_INTERVAL_MS = 120

// ─── Model loading ────────────────────────────────────────────────────────────

let _loadPromise: Promise<void> | null = null

/**
 * Load face-api.js models from /public/models/.
 * Memoized — safe to call repeatedly (StrictMode double-mounts, re-renders).
 *
 * On transient failure (e.g. network blip on first load), we clear the cached
 * promise so the next call can retry. Without this, a single failed load
 * would poison `_loadPromise` forever until the page is refreshed.
 */
export function loadFaceModels(): Promise<void> {
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    const t0 = performance.now()
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    console.info(`[faceAuth] models loaded in ${(performance.now() - t0).toFixed(0)}ms`)
  })().catch((err) => {
    _loadPromise = null
    throw err
  })
  return _loadPromise
}

// ─── Detection / capture ──────────────────────────────────────────────────────

const detectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
})

/**
 * Run one detection pass on the current video frame.
 * Returns null if no face was found with high enough confidence.
 */
export async function detectOne(video: HTMLVideoElement): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(video, detectorOptions)
    .withFaceLandmarks(true) // tiny landmark model
    .withFaceDescriptor()
  return result?.descriptor ?? null
}

/**
 * Capture N face descriptors from the video stream and return their mean.
 *
 * Strategy: poll until we have `samples` successful detections or the timeout
 * hits. Each dimension of the final descriptor is the arithmetic mean of the
 * corresponding dimension across all captured frames.
 *
 * Throws if no face is detected within the timeout window — the UI should
 * surface this as "move into better lighting" or "camera covered?".
 */
export async function captureDescriptor(
  video: HTMLVideoElement,
  samples: number = ENROLLMENT_SAMPLES,
  onProgress?: (captured: number, total: number) => void,
  delayBetweenCaptures: number = CAPTURE_DELAY_MS,
): Promise<Float32Array> {
  if (!video || video.readyState < 2) {
    throw new Error('Video element not ready (readyState < HAVE_CURRENT_DATA)')
  }

  const captured: Float32Array[] = []
  const deadline = Date.now() + CAPTURE_TIMEOUT_MS

  while (captured.length < samples) {
    if (Date.now() > deadline) {
      throw new Error(
        `Face not detected in time (${captured.length}/${samples} samples). ` +
          `Try better lighting or move closer to the camera.`,
      )
    }

    const descriptor = await detectOne(video)
    if (descriptor) {
      captured.push(descriptor)
      onProgress?.(captured.length, samples)
      // Pause between successful captures so the user can actually see the
      // progress counter tick upward. Skipped after the final sample.
      if (captured.length < samples && delayBetweenCaptures > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayBetweenCaptures))
      }
    } else {
      await new Promise<void>((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS))
    }
  }

  // Arithmetic mean across all 128 dimensions
  const avg = new Float32Array(128)
  for (const d of captured) {
    for (let i = 0; i < 128; i++) avg[i] += d[i]
  }
  for (let i = 0; i < 128; i++) avg[i] /= captured.length
  return avg
}

// ─── Matching ────────────────────────────────────────────────────────────────

/**
 * Compute euclidean distance between two 128-dim descriptors.
 * Returns `match: true` when distance < FACE_MATCH_THRESHOLD.
 *
 * We use strict inequality so a distance of exactly 0.5 is NOT a match.
 */
export function matchDescriptor(
  stored: Float32Array,
  live: Float32Array,
): { distance: number; match: boolean } {
  if (stored.length !== 128 || live.length !== 128) {
    return { distance: Infinity, match: false }
  }
  let sum = 0
  for (let i = 0; i < 128; i++) {
    const d = stored[i] - live[i]
    sum += d * d
  }
  const distance = Math.sqrt(sum)
  return { distance, match: distance < FACE_MATCH_THRESHOLD }
}

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Convert a 128-dim Float32Array descriptor to a 512-byte Uint8Array for
 * storage. Copies into a freshly-allocated ArrayBuffer so the result is
 * always an owned Uint8Array<ArrayBuffer> (required by Web Crypto API
 * under TypeScript 5's strict buffer generics).
 */
export function serializeDescriptor(d: Float32Array): Uint8Array {
  const out = new Uint8Array(d.byteLength)
  out.set(new Uint8Array(d.buffer, d.byteOffset, d.byteLength))
  return out
}

/**
 * Inverse of serializeDescriptor. Copies the bytes first to guarantee
 * 4-byte alignment for the Float32Array view.
 */
export function deserializeDescriptor(bytes: Uint8Array): Float32Array {
  if (bytes.byteLength !== 512) {
    throw new Error(`Expected 512 bytes for face descriptor, got ${bytes.byteLength}`)
  }
  const copy = new Uint8Array(bytes)
  return new Float32Array(copy.buffer)
}
