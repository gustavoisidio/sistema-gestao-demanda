import { mean } from '../../lib/stats'
import { seriesFor, sliceByDates } from '../series/aggregate'
import type { Freq, SaleRecord, Series } from '../../types'

export interface ComparedSeries {
  sku: string
  points: Series
}

/** SPEC-EDA-13: uma série por SKU (ordem da seleção), opcionalmente normalizada para índice base 100. */
export function compareSeries(
  records: readonly SaleRecord[],
  skus: readonly string[],
  freq: Freq,
  inicio: string,
  fim: string,
  normalizar: boolean,
): ComparedSeries[] {
  return skus.map((sku) => {
    const points = sliceByDates(seriesFor(records, sku, freq), inicio, fim)
    const m = mean(points.map((p) => p.value))
    return { sku, points: normalizar && m > 0 ? points.map((p) => ({ date: p.date, value: (p.value / m) * 100 })) : points }
  })
}
