/**
 * contract.ts
 *
 * Typed wrapper around the HealthVault smart contract.
 * All blockchain interactions go through this service.
 *
 * Usage:
 *   import { getHealthVaultService } from '@/services/contract'
 *   const svc = getHealthVaultService(signerOrProvider, chainId)
 *   await svc.registerPatient('0x02abc...')
 */

import { ethers } from 'ethers'
import ABI from '../contracts/HealthVault.abi.json'
import { getContractAddress } from '../contracts/addresses'
import {
  RecordCategory,
  AccessLevel,
  type RecordPointer,
  type GrantInfo,
} from '../types/health'
import type { AuditEvent, RecordWriteParams, GrantAccessParams } from '../types/contract'

// ─── Internal helpers ──────────────────────────────────────────────────────────

function toRecordPointer(raw: {
  cid: string
  dataHash: string
  encryptedDEK: string
  createdAt: bigint
  updatedAt: bigint
  lastModifiedBy: string
}): RecordPointer {
  return {
    cid: raw.cid,
    dataHash: raw.dataHash,
    encryptedDEK: raw.encryptedDEK,
    createdAt: Number(raw.createdAt),
    updatedAt: Number(raw.updatedAt),
    lastModifiedBy: raw.lastModifiedBy,
  }
}

// ─── HealthVaultService ────────────────────────────────────────────────────────

export class HealthVaultService {
  private contract: ethers.Contract
  private readContract: ethers.Contract

  /**
   * @param signerOrProvider - ethers Signer (for writes) or Provider (for reads)
   * @param chainId          - current chain ID (used to look up contract address)
   */
  constructor(signerOrProvider: ethers.Signer | ethers.Provider, chainId: number) {
    const address = getContractAddress(chainId)
    this.contract = new ethers.Contract(address, ABI, signerOrProvider)
    // Read-only contract (avoids prompting MetaMask for pure view calls)
    this.readContract =
      signerOrProvider instanceof ethers.Signer
        ? new ethers.Contract(address, ABI, signerOrProvider.provider ?? signerOrProvider)
        : this.contract
  }

  // ── Patient ──────────────────────────────────────────────────────────────────

  /**
   * Register the connected wallet as a patient, posting their ECIES public key on-chain.
   * Must be called once before any records can be added.
   *
   * @param eciesPublicKeyHex - hex-encoded compressed ECIES public key (from deriveKeypairFromSignature)
   */
  async registerPatient(eciesPublicKeyHex: string): Promise<ethers.TransactionResponse> {
    return this.contract.registerPatient(eciesPublicKeyHex) as Promise<ethers.TransactionResponse>
  }

  async isPatientRegistered(patient: string): Promise<boolean> {
    return this.readContract.isPatientRegistered(patient) as Promise<boolean>
  }

  async getPatientPublicKey(patient: string): Promise<string> {
    return this.readContract.getPatientPublicKey(patient) as Promise<string>
  }

  // ── Provider ─────────────────────────────────────────────────────────────────

  /**
   * Register the connected wallet as a health provider, posting their ECIES public key.
   */
  async registerProvider(eciesPublicKeyHex: string): Promise<ethers.TransactionResponse> {
    return this.contract.registerProvider(eciesPublicKeyHex) as Promise<ethers.TransactionResponse>
  }

  async getProviderPublicKey(provider: string): Promise<string> {
    return this.readContract.getProviderPublicKey(provider) as Promise<string>
  }

  // ── Access Control ───────────────────────────────────────────────────────────

  /**
   * Grant a provider access to a specific health record category.
   * The caller must be the patient (tx.origin == patient address).
   *
   * providerWrappedDEK: the category's DEK re-encrypted for the provider's public key.
   * Generate this with: wrapDEK(dek, providerPublicKeyBytes)
   */
  async grantAccess(params: GrantAccessParams): Promise<ethers.TransactionResponse> {
    return this.contract.grantAccess(
      params.provider,
      params.category,
      params.level,
      params.providerWrappedDEK,
    ) as Promise<ethers.TransactionResponse>
  }

  /**
   * Revoke a provider's access to a specific category.
   * Caller must be the patient.
   */
  async revokeAccess(
    provider: string,
    category: RecordCategory,
  ): Promise<ethers.TransactionResponse> {
    return this.contract.revokeAccess(provider, category) as Promise<ethers.TransactionResponse>
  }

  /**
   * Get the access level a provider has for a patient's category.
   * Returns AccessLevel enum value (0=None, 1=ReadOnly, 2=ReadWrite).
   */
  async getAccessLevel(
    patient: string,
    provider: string,
    category: RecordCategory,
  ): Promise<AccessLevel> {
    const level = (await this.readContract.getAccessLevel(patient, provider, category)) as bigint
    return Number(level) as AccessLevel
  }

  /**
   * Get the wrapped DEK for a specific provider + patient + category.
   * The provider decrypts this with their ECIES private key to get the DEK.
   */
  async getProviderWrappedDEK(
    patient: string,
    provider: string,
    category: RecordCategory,
  ): Promise<string> {
    return this.readContract.getProviderWrappedDEK(
      patient,
      provider,
      category,
    ) as Promise<string>
  }

  /**
   * List all access grants for a patient (all providers + categories).
   */
  async listGrantsForPatient(patient: string): Promise<GrantInfo[]> {
    const [providers, categories, levels, grantedAts] = (await this.readContract.listGrantsForPatient(patient)) as [
      string[],
      bigint[],
      bigint[],
      bigint[],
    ]
    return providers.map((provider, i) => ({
      provider,
      category: Number(categories[i]) as RecordCategory,
      level: Number(levels[i]) as AccessLevel,
      grantedAt: Number(grantedAts[i]),
    }))
  }

  // ── Records ──────────────────────────────────────────────────────────────────

  /**
   * Add a new health record for a patient.
   * Caller can be the patient OR a provider with ReadWrite access.
   *
   * encryptedDEK: the DEK encrypted with the *patient's* ECIES public key.
   */
  async addRecord(params: RecordWriteParams): Promise<ethers.TransactionResponse> {
    return this.contract.addRecord(
      params.patient,
      params.category,
      params.cid,
      params.dataHash,
      params.encryptedDEK,
    ) as Promise<ethers.TransactionResponse>
  }

  /**
   * Update an existing health record.
   * Caller can be the patient OR a provider with ReadWrite access.
   */
  async updateRecord(params: RecordWriteParams): Promise<ethers.TransactionResponse> {
    return this.contract.updateRecord(
      params.patient,
      params.category,
      params.cid,
      params.dataHash,
      params.encryptedDEK,
    ) as Promise<ethers.TransactionResponse>
  }

  /**
   * Get the record pointer for a patient's category.
   * NOTE: This is NOT a view function — it emits RecordAccessed on-chain (audit trail).
   * Returns null if no record exists (cid will be empty string).
   */
  async getRecord(patient: string, category: RecordCategory): Promise<RecordPointer | null> {
    const raw = (await this.contract.getRecord(patient, category)) as {
      cid: string
      dataHash: string
      encryptedDEK: string
      createdAt: bigint
      updatedAt: bigint
      lastModifiedBy: string
    }
    if (!raw.cid) return null
    return toRecordPointer(raw)
  }

  /**
   * Peek at a record without triggering the audit log event.
   * Use this only for UI display purposes (e.g., checking if a record exists).
   * Does NOT emit RecordAccessed.
   *
   * Note: This requires the contract to expose a view version of getRecord.
   * If not available, fall back to getRecord() which will emit the event.
   */
  async peekRecord(patient: string, category: RecordCategory): Promise<RecordPointer | null> {
    try {
      // Try a static call (no state change, no MetaMask prompt)
      const raw = (await this.readContract.getRecord.staticCall(patient, category)) as {
        cid: string
        dataHash: string
        encryptedDEK: string
        createdAt: bigint
        updatedAt: bigint
        lastModifiedBy: string
      }
      if (!raw.cid) return null
      return toRecordPointer(raw)
    } catch {
      return null
    }
  }

  // ── Audit Log ────────────────────────────────────────────────────────────────

  /**
   * Query all audit events for a patient address.
   * Sorted by block number ascending.
   */
  async queryAuditEvents(patient: string): Promise<AuditEvent[]> {
    const filter = { fromBlock: 0, toBlock: 'latest' }
    const events: AuditEvent[] = []

    const [added, updated, accessed, granted, revoked] = await Promise.all([
      this.contract.queryFilter(this.contract.filters.RecordAdded(patient), filter.fromBlock, filter.toBlock),
      this.contract.queryFilter(this.contract.filters.RecordUpdated(patient), filter.fromBlock, filter.toBlock),
      this.contract.queryFilter(this.contract.filters.RecordAccessed(patient), filter.fromBlock, filter.toBlock),
      this.contract.queryFilter(this.contract.filters.AccessGranted(patient), filter.fromBlock, filter.toBlock),
      this.contract.queryFilter(this.contract.filters.AccessRevoked(patient), filter.fromBlock, filter.toBlock),
    ])

    for (const e of added) {
      const log = e as ethers.EventLog
      events.push({
        type: 'RecordAdded',
        patient,
        actor: log.args[1] as string,
        category: Number(log.args[2]) as RecordCategory,
        cid: log.args[3] as string,
        dataHash: log.args[4] as string,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Number(log.args[5]),
      })
    }

    for (const e of updated) {
      const log = e as ethers.EventLog
      events.push({
        type: 'RecordUpdated',
        patient,
        actor: log.args[1] as string,
        category: Number(log.args[2]) as RecordCategory,
        cid: log.args[4] as string,
        dataHash: log.args[5] as string,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Number(log.args[6]),
      })
    }

    for (const e of accessed) {
      const log = e as ethers.EventLog
      events.push({
        type: 'RecordAccessed',
        patient,
        actor: log.args[1] as string,
        category: Number(log.args[2]) as RecordCategory,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Number(log.args[3]),
      })
    }

    for (const e of granted) {
      const log = e as ethers.EventLog
      events.push({
        type: 'AccessGranted',
        patient,
        actor: log.args[1] as string,
        category: Number(log.args[2]) as RecordCategory,
        level: Number(log.args[3]) as AccessLevel,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Number(log.args[4]),
      })
    }

    for (const e of revoked) {
      const log = e as ethers.EventLog
      events.push({
        type: 'AccessRevoked',
        patient,
        actor: log.args[1] as string,
        category: Number(log.args[2]) as RecordCategory,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Number(log.args[3]),
      })
    }

    return events.sort((a, b) => a.blockNumber - b.blockNumber)
  }

  /**
   * Get the underlying ethers.Contract instance for advanced usage.
   */
  getRawContract(): ethers.Contract {
    return this.contract
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────────

/** Singleton map: chainId → service instance */
const _instances = new Map<string, HealthVaultService>()

/**
 * Get (or create) a HealthVaultService for the given signer/provider and chainId.
 * Re-uses the same instance if called again with the same chainId.
 */
export function getHealthVaultService(
  signerOrProvider: ethers.Signer | ethers.Provider,
  chainId: number,
): HealthVaultService {
  const key = `${chainId}`
  if (!_instances.has(key)) {
    _instances.set(key, new HealthVaultService(signerOrProvider, chainId))
  }
  return _instances.get(key)!
}

/**
 * Force-create a new HealthVaultService (use after account/network change).
 */
export function createHealthVaultService(
  signerOrProvider: ethers.Signer | ethers.Provider,
  chainId: number,
): HealthVaultService {
  const svc = new HealthVaultService(signerOrProvider, chainId)
  _instances.set(`${chainId}`, svc)
  return svc
}
