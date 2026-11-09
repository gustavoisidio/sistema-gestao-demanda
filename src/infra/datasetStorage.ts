import type { SaleRecord } from '../types'
import { getItem, removeItem, setItem } from './storage.service'
import { STORAGE_KEYS } from './storageKeys'

export const CURRENT_SCHEMA_VERSION = 1

export interface StoredDataset {
  schemaVersion: number
  origem: string
  registros: SaleRecord[]
  salvoEm: string
}

/** SPEC-PER-02: versão desconhecida ou formato corrompido é descartado sem lançar. */
export function loadDataset(): { origem: string; registros: SaleRecord[] } | null {
  const stored = getItem<StoredDataset>(STORAGE_KEYS.dataset)
  if (!stored || stored.schemaVersion !== CURRENT_SCHEMA_VERSION) return null
  if (typeof stored.origem !== 'string' || !Array.isArray(stored.registros)) return null
  const ok = stored.registros.every((r) => r && typeof r.sku === 'string' && typeof r.data === 'string' && typeof r.quantidade_vendida === 'number')
  return ok ? { origem: stored.origem, registros: stored.registros } : null
}

/** SPEC-PER-03 / SPEC-PER-04: `false` quando a gravação falha (a base segue em memória). */
export function saveDataset(origem: string, registros: SaleRecord[], agora = new Date()): boolean {
  const payload: StoredDataset = { schemaVersion: CURRENT_SCHEMA_VERSION, origem, registros, salvoEm: agora.toISOString() }
  return setItem(STORAGE_KEYS.dataset, payload)
}

export function clearDataset(): void {
  removeItem(STORAGE_KEYS.dataset)
}
