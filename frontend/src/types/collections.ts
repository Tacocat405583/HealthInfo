/**
 * Domain types for IPFS-persisted collections.
 * Each type is stored as a JSON array in a specific RecordCategory slot.
 *
 * Category mapping:
 *   Labs        → LabOrder[]
 *   Pharmacy    → Prescription[]
 *   Primary     → ClinicalNote[]   (doctor's SOAP notes per patient)
 *   MentalHealth → PersonalNote[]  (patient's private notes)
 *   Scheduling  → Appointment[]
 */

export interface Appointment {
  id: string
  date: string            // ISO date string e.g. "2026-04-10"
  time: string            // "10:30 AM"
  duration: string        // "30 min"
  patientAddress: string
  patientName: string
  providerAddress: string
  providerName: string
  type: string            // "Follow-up" | "New Patient" | "Annual Wellness" | etc.
  mode: 'in-person' | 'telehealth'
  location: string
  reason: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  createdAt: string
}

export interface LabOrderItem {
  name: string
  value: string
  range: string
  status: 'normal' | 'warning'
}

export interface LabOrder {
  id: string
  orderedByAddress: string
  orderedByName: string
  test: string
  ordered: string         // display date e.g. "Apr 3, 2026"
  resulted: string | null
  status: 'pending-review' | 'reviewed'
  urgent: boolean
  items: LabOrderItem[]
}

export interface Prescription {
  id: string
  prescribedByAddress: string
  prescribedByName: string
  patientAddress: string
  patientName: string
  medication: string
  dosage: string
  sig: string             // directions e.g. "Once daily"
  refills: number
  written: string         // display date e.g. "Jan 15, 2026"
  status: 'active' | 'expired' | 'cancelled'
}

export interface ClinicalNote {
  id: string
  authorAddress: string
  authorName: string
  patientAddress: string
  patientName: string
  title: string
  content: string         // SOAP note or free text
  createdAt: string
  updatedAt: string
}

export interface PersonalNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
