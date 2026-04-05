/**
 * ipfs.ts
 *
 * IPFS upload and fetch via the Kubo HTTP API (local dev) or Pinata (production).
 *
 * Environment variables:
 *   VITE_IPFS_API_URL       - Kubo RPC endpoint (default: http://localhost:5001)
 *   VITE_IPFS_GATEWAY_URL   - IPFS HTTP gateway for fetching (default: http://localhost:8080)
 *   VITE_PINATA_JWT         - If set, Pinata is used for uploads instead of local Kubo
 *   VITE_PINATA_GATEWAY_URL - Pinata gateway (default: https://gateway.pinata.cloud)
 *
 * Dev setup:
 *   1. Install Kubo: https://docs.ipfs.tech/install/command-line/
 *   2. Run: ipfs daemon
 *   3. Enable CORS: ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
 *
 * The CID returned from upload is a v1 base32 CID (e.g. bafy...).
 */

const IPFS_API = import.meta.env.VITE_IPFS_API_URL ?? 'http://localhost:5001'
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY_URL ?? 'http://localhost:8080'
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT ?? ''
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY_URL ?? 'https://gateway.pinata.cloud'

/** Returns true if Pinata is configured for this environment. */
function usePinata(): boolean {
  return Boolean(PINATA_JWT)
}

// ─── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload an encrypted blob to IPFS.
 * Returns the CID string (e.g. "bafy...").
 *
 * @param payload - the encrypted binary blob (output of encryptFile)
 * @param filename - optional filename hint stored in IPFS metadata
 */
export async function uploadToIPFS(payload: Uint8Array, filename = 'record'): Promise<string> {
  if (usePinata()) {
    return uploadViaPinata(payload, filename)
  }
  return uploadViaKubo(payload, filename)
}

async function uploadViaKubo(payload: Uint8Array, filename: string): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([payload as BlobPart]), filename)

  const res = await fetch(`${IPFS_API}/api/v0/add?cid-version=1&quieter=true`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    throw new Error(`IPFS add failed: ${res.status} ${await res.text()}`)
  }

  // Kubo returns newline-delimited JSON; the last line has the final CID
  const text = await res.text()
  const lines = text.trim().split('\n')
  const last = JSON.parse(lines[lines.length - 1]) as { Hash: string }
  return last.Hash
}

async function uploadViaPinata(payload: Uint8Array, filename: string): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([payload as BlobPart]), filename)
  form.append(
    'pinataMetadata',
    JSON.stringify({ name: `healthvault-${filename}-${Date.now()}` }),
  )
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  })

  if (!res.ok) {
    throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as { IpfsHash: string }
  return json.IpfsHash
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetch an encrypted blob from IPFS by CID.
 * Returns the raw bytes exactly as they were uploaded.
 *
 * @param cid - IPFS content identifier string
 */
export async function fetchFromIPFS(cid: string): Promise<Uint8Array> {
  if (usePinata()) {
    return fetchViaGateway(`${PINATA_GATEWAY}/ipfs/${cid}`)
  }
  return fetchViaGateway(`${IPFS_GATEWAY}/ipfs/${cid}`)
}

async function fetchViaGateway(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`IPFS fetch failed: ${res.status} ${url}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

// ─── Verify integrity ─────────────────────────────────────────────────────────

/**
 * Verify a fetched blob against the on-chain keccak256 data hash.
 * Import keccak_256 from @noble/hashes/sha3 in the caller.
 *
 * Usage:
 *   import { keccak_256 } from '@noble/hashes/sha3'
 *   import { bytesToHex } from '@noble/hashes/utils'
 *   const ok = verifyDataHash(payload, pointer.dataHash)
 */
export function verifyDataHash(
  payload: Uint8Array,
  expectedHash: string,
  keccak256Fn: (data: Uint8Array) => Uint8Array,
): boolean {
  const { bytesToHex } = { bytesToHex: (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('') }
  const actual = '0x' + bytesToHex(keccak256Fn(payload))
  return actual.toLowerCase() === expectedHash.toLowerCase()
}
