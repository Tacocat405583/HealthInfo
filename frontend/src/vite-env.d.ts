/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID: string
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_IPFS_API_URL: string
  readonly VITE_IPFS_GATEWAY_URL: string
  readonly VITE_PINATA_JWT: string
  readonly VITE_PINATA_GATEWAY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
