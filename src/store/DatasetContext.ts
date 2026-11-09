import { createContext } from 'react'
import type { DatasetSummary, SaleRecord } from '../types'

export interface DatasetState {
  records: SaleRecord[] | null
  origem: string | null
  summary: DatasetSummary | null
  skus: string[]
  /** a última gravação no aparelho falhou (SPEC-PER-04) */
  saveFailed: boolean
  setDataset: (records: SaleRecord[], origem: string) => void
  loadDemo: () => Promise<void>
  clear: () => void
  dismissSaveWarning: () => void
}

export const DatasetContext = createContext<DatasetState | null>(null)
