/**
 * localCollection.ts
 *
 * localStorage-backed fallback for the collection service.
 * Used when IPFS / the HealthVault contract are not available (e.g. no running
 * Hardhat node or Pinata JWT in dev).  Data is stored unencrypted — demo only.
 *
 * Key format:  hv_col_{lowerCaseAddress}_{categoryNumber}
 */

const key = (patient: string, category: number): string =>
  `hv_col_${patient.toLowerCase()}_${category}`

export function localGet<T>(patient: string, category: number): T[] {
  try {
    const raw = localStorage.getItem(key(patient, category))
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function localSave<T>(patient: string, category: number, items: T[]): void {
  localStorage.setItem(key(patient, category), JSON.stringify(items))
}

export function localAdd<T extends { id: string }>(
  patient: string,
  category: number,
  item: T,
): void {
  localSave(patient, category, [...localGet<T>(patient, category), item])
}

export function localUpdate<T extends { id: string }>(
  patient: string,
  category: number,
  item: T,
): void {
  const items = localGet<T>(patient, category)
  const idx = items.findIndex((i) => i.id === item.id)
  localSave(
    patient,
    category,
    idx >= 0 ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item],
  )
}

export function localRemove(patient: string, category: number, itemId: string): void {
  localSave(
    patient,
    category,
    localGet<{ id: string }>(patient, category).filter((i) => i.id !== itemId),
  )
}
