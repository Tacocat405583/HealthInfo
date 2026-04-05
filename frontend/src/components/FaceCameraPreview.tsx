/**
 * FaceCameraPreview.tsx
 *
 * Minimal wrapper over a <video> element with getUserMedia lifecycle.
 *
 *  - Mounts → requests camera permission, attaches the stream
 *  - Fires onReady(video) once the stream is playing
 *  - Unmounts → stops all tracks (releases the camera LED)
 *
 * Callbacks are captured via refs so they don't need to be stable from the
 * parent — the effect only re-runs when `active` toggles.
 */

import { useEffect, useRef } from 'react'

interface Props {
  /** When true, the camera is requested and the stream attached. */
  active: boolean
  /** Called once after the <video> element has a live stream and is playing. */
  onReady?: (video: HTMLVideoElement) => void
  /** Called with a user-friendly message if permission is denied or camera is missing. */
  onError?: (message: string) => void
}

export function FaceCameraPreview({ active, onReady, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)
  onReadyRef.current = onReady
  onErrorRef.current = onError

  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    if (!video) return

    let stream: MediaStream | null = null
    let cancelled = false

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not available in this browser')
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        // Cleanup may have run while video.play() was pending. Re-check
        // before invoking onReady so consumers never receive a <video>
        // whose MediaStream tracks are already stopped.
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        onReadyRef.current?.(video)
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow access and retry.'
              : err.name === 'NotFoundError'
                ? 'No camera found on this device.'
                : err.message
            : 'Camera failed to start'
        onErrorRef.current?.(msg)
      }
    })()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [active])

  return (
    <video
      ref={videoRef}
      className="w-64 h-64 rounded-xl object-cover bg-gray-100 ring-2 ring-blue-600/40 shadow-sm"
      playsInline
      muted
      autoPlay
    />
  )
}
