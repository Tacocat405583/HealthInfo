/**
 * Mirrors the RecordCategory enum in HealthVault.sol.
 * The numeric values MUST match the Solidity enum order.
 */
export enum RecordCategory {
  Dental = 0,
  Cardiology = 1,
  Urology = 2,
  Primary = 3,
  Pharmacy = 4,
  Labs = 5,
  Imaging = 6,
  MentalHealth = 7,
  Scheduling = 8,
}

export const RECORD_CATEGORY_LABELS: Record<RecordCategory, string> = {
  [RecordCategory.Dental]: 'Dental',
  [RecordCategory.Cardiology]: 'Cardiology',
  [RecordCategory.Urology]: 'Urology',
  [RecordCategory.Primary]: 'Primary Care',
  [RecordCategory.Pharmacy]: 'Pharmacy',
  [RecordCategory.Labs]: 'Lab Results',
  [RecordCategory.Imaging]: 'Imaging',
  [RecordCategory.MentalHealth]: 'Mental Health',
  [RecordCategory.Scheduling]: 'Scheduling',
}

export const ALL_CATEGORIES = Object.values(RecordCategory).filter(
  (v) => typeof v === 'number',
) as RecordCategory[]

/**
 * Mirrors the AccessLevel enum in HealthVault.sol.
 */
export enum AccessLevel {
  None = 0,
  ReadOnly = 1,
  ReadWrite = 2,
}

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  [AccessLevel.None]: 'No Access',
  [AccessLevel.ReadOnly]: 'Read Only',
  [AccessLevel.ReadWrite]: 'Read & Write',
}

/**
 * On-chain record pointer returned by getRecord().
 * cid         — IPFS content identifier for the encrypted blob
 * dataHash    — keccak256 of the encrypted blob (integrity check)
 * encryptedDEK — AES-256 data encryption key, wrapped with patient's ECIES public key
 * createdAt   — Unix timestamp (seconds)
 * updatedAt   — Unix timestamp (seconds)
 * lastModifiedBy — address of the last writer (patient or provider)
 */
export interface RecordPointer {
  cid: string
  dataHash: string
  encryptedDEK: string
  createdAt: number
  updatedAt: number
  lastModifiedBy: string
}

/**
 * Access grant info returned by listGrantsForPatient().
 */
export interface GrantInfo {
  provider: string
  category: RecordCategory
  level: AccessLevel
  grantedAt: number
}

/**
 * A decrypted health record after fetching from IPFS and decrypting.
 */
export interface DecryptedRecord {
  category: RecordCategory
  mimeType: string
  filename: string
  /** Raw binary content of the decrypted file */
  data: Uint8Array
  /** Object URL suitable for <img> / <iframe> / download link */
  objectUrl: string
  pointer: RecordPointer
}
