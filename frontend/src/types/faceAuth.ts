/**
 * faceAuth.ts — Types for the face-recognition 2FA flow.
 *
 * Face auth sits between Web3Provider and EncryptionProvider in the provider
 * stack: once verified, EncryptionProvider.initKeys() is allowed to run.
 */

export enum FaceAuthStatus {
  /** No wallet yet, nothing to do */
  Idle = 'idle',
  /** Wallet connected, deciding whether to enroll or verify */
  WalletReady = 'wallet_ready',
  /** First time on this device — user must enroll their face */
  NeedsEnrollment = 'needs_enrollment',
  /** Loading face-api.js models (~6 MB first load) */
  CameraLoading = 'camera_loading',
  /** Capturing N sample frames during enrollment */
  Enrolling = 'enrolling',
  /** AES-encrypting the descriptor and pinning to IPFS */
  EncryptingAndUploading = 'encrypting_and_uploading',
  /** Has a stored descriptor — ready for live verification */
  AwaitingFaceVerify = 'awaiting_face_verify',
  /** Running the live detection loop, comparing to stored */
  Verifying = 'verifying',
  /** Face matched — EncryptionProvider.initKeys() can run */
  Verified = 'verified',
  /** Too many failed attempts — cooldown or recovery CTA */
  Locked = 'locked',
  /** Fetching encrypted descriptor from IPFS for a new device */
  Recovery = 'recovery',
}

/** Record shape stored in the healthvault-faces IndexedDB. */
export interface StoredFace {
  /** Lowercase wallet address */
  id: string
  /** [12 bytes AES-GCM IV][ciphertext + 16 bytes auth tag] */
  encryptedBlob: Uint8Array
  /** IPFS CID returned when the blob was pinned */
  cid: string
  /** Date.now() at enrollment time */
  enrolledAt: number
  /** Schema version for future migrations */
  schemaVersion: 1
}

/** Result returned from a successful enrollment. */
export interface FaceEnrollResult {
  cid: string
  enrolledAt: number
}
