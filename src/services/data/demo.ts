import type { SaleRecord } from '../../types'
import { applyDefaultTreatment } from './clean'
import { parseCsvText } from './parse'

/** SPEC-DAT-13: texto da demo → registros tratados. */
export function buildDemoRecords(csvText: string): SaleRecord[] {
  const result = parseCsvText(csvText)
  if (!result.ok) throw new Error(result.message)
  return applyDefaultTreatment(result.table.rows)
}
