/**
 * useAuditLog.ts
 *
 * Query the on-chain audit trail for a patient.
 * Reconstructed from contract events (no extra gas cost).
 *
 * Usage:
 *   const { events, isLoading } = useAuditLog(patientAddress)
 *   // events: AuditEvent[] sorted by blockNumber descending (newest first)
 */

import { useQuery } from '@tanstack/react-query'
import { useContract } from './useContract'
import type { AuditEvent } from '../types/contract'
import { RecordCategory, AccessLevel } from '../types/health'

export function useAuditLog(patientAddress: string | null) {
  const svc = useContract()

  return useQuery({
    queryKey: ['auditLog', patientAddress],
    enabled: Boolean(svc && patientAddress),
    // Audit logs can be large — cache longer and don't auto-refetch aggressively
    staleTime: 60_000,
    queryFn: async (): Promise<AuditEvent[]> => {
      if (!svc || !patientAddress) return []
      const events = await svc.queryAuditEvents(patientAddress)
      // Return newest first for display
      return events.reverse()
    },
  })
}

/**
 * Filter audit events to a specific category.
 */
export function useAuditLogForCategory(
  patientAddress: string | null,
  category: RecordCategory,
) {
  const { data: events, ...rest } = useAuditLog(patientAddress)

  const filtered = events?.filter(
    (e) => e.category === category || e.category === undefined,
  ) ?? []

  return { events: filtered, ...rest }
}

/**
 * Describe an audit event as a human-readable string.
 */
export function describeAuditEvent(event: AuditEvent): string {
  const categoryName = event.category !== undefined
    ? RecordCategory[event.category]
    : 'unknown category'
  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  switch (event.type) {
    case 'PatientRegistered':
      return `Patient ${short(event.patient)} registered`
    case 'ProviderRegistered':
      return `Provider registered`
    case 'AccessGranted': {
      const levelName = event.level !== undefined ? AccessLevel[event.level] : ''
      return `${short(event.actor ?? '')} granted ${levelName} access to ${categoryName}`
    }
    case 'AccessRevoked':
      return `Access to ${categoryName} revoked from ${short(event.actor ?? '')}`
    case 'RecordAdded':
      return `New ${categoryName} record added by ${short(event.actor ?? '')}`
    case 'RecordUpdated':
      return `${categoryName} record updated by ${short(event.actor ?? '')}`
    case 'RecordAccessed':
      return `${categoryName} record accessed by ${short(event.actor ?? '')}`
    default:
      return event.type
  }
}
