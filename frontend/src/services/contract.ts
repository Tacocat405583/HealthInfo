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
    if (!address) throw new Error(`No HealthVault contract address configured for chain ${chainId}`)
    this.contract = new ethers.Contract(address, ABI, signerOrProvider)
    // Read-only contract (avoids prompting MetaMask for pure view calls)
    const provider = (signerOrProvider as ethers.Signer).provider
    this.readContract = provider
      ? new ethers.Contract(address, ABI, provider)
      : this.contract
    // Read-only contract (avoids prompting MetaMask for pure view calls).
    // If we got a Signer without an attached Provider, we can't build a true
    // read-only runner — fall back to the writable contract and warn, so callers
    // can notice that view calls may prompt the wallet in this degraded state.
    if (signerOrProvider instanceof ethers.Signer) {
      if (signerOrProvider.provider) {
        this.readContract = new ethers.Contract(address, ABI, signerOrProvider.provider)
      } else {
        console.warn(
          'HealthVaultService: Signer has no attached provider; read calls will use the Signer and may prompt the wallet.',
        )
        this.readContract = this.contract
      }
    } else {
      this.readContract = this.contract
    }
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
    } catch (err) {
      // Swallowing errors here would hide real RPC/network failures and make
      // "no record" indistinguishable from "failed to fetch". Log the cause so
      // it's visible in devtools; still return null so callers can render a
      // neutral "no data yet" state without crashing.
      console.warn(`peekRecord failed for patient=${patient} category=${category}:`, err)
      return null
    }
  }

  // ── Audit Log ────────────────────────────────────────────────────────────────

  /**
   * Query all audit events for a patient address.
   * Sorted by block number ascending.
   *
   * NOTE: defaults scan from genesis (block 0) which works on the Hardhat local
   * node but will hit RPC provider range limits (typically 10k blocks) on
   * Sepolia/mainnet. Pass an explicit `fromBlock` near the patient registration
   * block, or replace this with a subgraph query for production deployments.
   */
  async queryAuditEvents(
    patient: string,
    fromBlock: number = 0,
    toBlock: number | 'latest' = 'latest',
  ): Promise<AuditEvent[]> {
    const events: AuditEvent[] = []

    const [added, updated, accessed, granted, revoked] = await Promise.all([
      this.contract.queryFilter(this.contract.filters.RecordAdded(patient), fromBlock, toBlock),
      this.contract.queryFilter(this.contract.filters.RecordUpdated(patient), fromBlock, toBlock),
      this.contract.queryFilter(this.contract.filters.RecordAccessed(patient), fromBlock, toBlock),
      this.contract.queryFilter(this.contract.filters.AccessGranted(patient), fromBlock, toBlock),
      this.contract.queryFilter(this.contract.filters.AccessRevoked(patient), fromBlock, toBlock),
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

/**
 * Create a fresh HealthVaultService for the given signer/provider and chainId.
 *
 * Note: a previous revision cached instances by chainId in a module-level Map,
 * but that returned stale instances after account switches on the same chain
 * (the cached Signer still referenced the old wallet). We now always return a
 * new instance; memoization for render stability should happen at the hook
 * layer (`useContract` already wraps this in `useMemo`).
 */
export function createHealthVaultService(
  signerOrProvider: ethers.Signer | ethers.Provider,
  chainId: number,
): HealthVaultService {
  return new HealthVaultService(signerOrProvider, chainId)
}

/** @deprecated Use `createHealthVaultService`. This alias exists only to avoid breaking older callers. */
export const getHealthVaultService = createHealthVaultService
