/**
 * useFaceAuth.ts
 *
 * Thin re-export of the FaceAuthProvider context, matching the project's
 * useWallet / useEncryption / etc. convention (hooks live under src/hooks/).
 *
 * Usage:
 *   const { status, isVerified, enrollFace, verifyFace } = useFaceAuth()
 */

export { useFaceAuthContext as useFaceAuth } from '../providers/FaceAuthProvider'
