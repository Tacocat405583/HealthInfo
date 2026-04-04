import type { RecordCategory, AccessLevel, RecordPointer, GrantInfo } from './health'

/** Unified audit event combining all on-chain event types. */
export interface AuditEvent {
  type:
    | 'PatientRegistered'
    | 'ProviderRegistered'
    | 'AccessGranted'
    | 'AccessRevoked'
    | 'RecordAdded'
    | 'RecordUpdated'
    | 'RecordAccessed'
  patient: string
  /** Present for access/record events */
  actor?: string
  category?: RecordCategory
  level?: AccessLevel
  cid?: string
  dataHash?: string
  blockNumber: number
  txHash: string
  timestamp?: number
}

/** Parameters for addRecord / updateRecord */
export interface RecordWriteParams {
  patient: string
  category: RecordCategory
  cid: string
  dataHash: string
  encryptedDEK: string
}

/** Parameters for grantAccess */
export interface GrantAccessParams {
  provider: string
  category: RecordCategory
  level: AccessLevel
  providerWrappedDEK: string
}

/** Full read-only view of a patient's state */
export interface PatientView {
  registered: boolean
  publicKeyHex: string
  grants: GrantInfo[]
  records: Partial<Record<RecordCategory, RecordPointer>>
}
