/**
 * An ECIES keypair using secp256k1.
 * Derived deterministically from the user's MetaMask signature.
 */
export interface ECIESKeypair {
  /** 32-byte raw private key */
  privateKey: Uint8Array
  /** 33-byte compressed public key */
  publicKey: Uint8Array
  /** Hex-encoded compressed public key — this is what gets posted on-chain */
  publicKeyHex: string
}

/**
 * A wrapped Data Encryption Key (DEK).
 * Format (base64-encoded):
 *   [33 bytes ephemeral pubkey][12 bytes IV][32 bytes AES-GCM ciphertext][16 bytes auth tag]
 * Total: 93 bytes → ~124 chars base64
 */
export type WrappedDEK = string

/**
 * A raw 256-bit AES Data Encryption Key.
 */
export type DEK = Uint8Array

/**
 * Result of encrypting a file for storage on IPFS.
 * Binary layout stored on IPFS:
 *   [4 bytes: IV length (LE)][IV][4 bytes: ciphertext length (LE)][ciphertext]
 */
export interface EncryptedBlob {
  /** Concatenated blob ready for IPFS upload */
  payload: Uint8Array
  /** The AES-GCM IV used (also embedded in payload) */
  iv: Uint8Array
  /** keccak256 hex of the entire payload — stored on-chain for integrity */
  dataHash: string
}
