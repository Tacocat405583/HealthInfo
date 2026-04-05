/**
 * sessionCache.ts
 *
 * Module-level cache for the key-derivation signature, shared between
 * FaceAuthProvider (decrypts the face descriptor) and EncryptionProvider
 * (derives the ECIES private key).
 *
 * Why this exists:
 *   Both subsystems need the same deterministic signature — the result of
 *   signer.signMessage(keyDerivationMessage(address)). Without a cache,
 *   the user would see TWO MetaMask "Sign" prompts per login: one for
 *   face verify, one for ECIES init. By caching the signature in memory
 *   for the current session, the second subsystem reuses the first's
 *   signature and the user sees exactly ONE prompt.
 *
 * Security properties:
 *   - Lifetime bounded to the JS module (page reload clears it)
 *   - NOT persisted to localStorage, sessionStorage, or IndexedDB
 *   - Cleared when the wallet address changes or disconnects
 *   - Address-scoped: recall() refuses a mismatch to prevent cross-account leaks
 *
 * This is NOT React state — it deliberately sits outside the component
 * tree so the signature never appears in DevTools' component inspector.
 */

let _cached: { address: string; signature: string } | null = null

/** Store a signature for the given address. */
export function rememberSignature(address: string, signature: string): void {
  _cached = { address: address.toLowerCase(), signature }
}

/**
 * Retrieve the cached signature for the given address, or null if none
 * is cached for this specific address.
 */
export function recallSignature(address: string): string | null {
  if (!_cached) return null
  if (_cached.address !== address.toLowerCase()) return null
  return _cached.signature
}

/** Wipe the cache. Call on wallet disconnect or account change. */
export function forgetSignature(): void {
  _cached = null
}
