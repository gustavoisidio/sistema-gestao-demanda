import type { RawRow, SaleRecord } from '../../types'
import { parseDate, parseQuantity } from './values'

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** SPEC-DAT-09: descarta sku/data inválidos, nulos e negativos → 0, ordena por sku e data. */
export function applyDefaultTreatment(rows: readonly RawRow[]): SaleRecord[] {
  const out: SaleRecord[] = []
  for (const row of rows) {
    const sku = (row.sku ?? '').trim()
    const data = parseDate(row.data)
    if (sku === '' || data === null) continue
    const q = parseQuantity(row.quantidade_vendida)
    out.push({ sku, data, quantidade_vendida: q === null ? 0 : Math.max(0, q) })
  }
  return out
    .map((rec, i) => ({ rec, i }))
    .sort((a, b) => compare(a.rec.sku, b.rec.sku) || compare(a.rec.data, b.rec.data) || a.i - b.i)
    .map(({ rec }) => rec)
}
