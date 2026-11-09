import type { Freq, Point, SaleRecord, Series } from '../../types'
import { addDays } from '../../lib/dates'
import { nextLabel, periodLabel } from './calendar'

/** SPEC-SER-01: soma por período e preenche com 0 os períodos sem registro. */
export function resample(points: readonly { date: string; value: number }[], freq: Freq): Series {
  if (points.length === 0) return []
  const sums = new Map<string, number>()
  let first = ''
  let last = ''
  for (const p of points) {
    const label = periodLabel(p.date, freq)
    sums.set(label, (sums.get(label) ?? 0) + p.value)
    if (first === '' || label < first) first = label
    if (last === '' || label > last) last = label
  }
  const out: Point[] = []
  for (let cur = first; cur <= last; cur = nextLabel(cur, freq)) {
    out.push({ date: cur, value: sums.get(cur) ?? 0 })
  }
  return out
}

/**
 * SPEC-SER-04: descarta períodos parciais nas pontas (só W e ME, e só com mais de 2 períodos).
 * `firstDate`/`lastDate` são a primeira e a última data do SKU. As condições são testadas
 * sobre a série original, antes de qualquer descarte (como no original).
 */
export function trimPartialPeriods(s: Series, freq: Freq, firstDate: string, lastDate: string): Series {
  if (freq === 'D' || s.length <= 2) return s
  const dropLast = s[s.length - 1].date > lastDate
  const dropFirst = freq === 'W' ? firstDate > addDays(s[0].date, -6) : Number(firstDate.slice(8, 10)) > 1
  return s.slice(dropFirst ? 1 : 0, dropLast ? s.length - 1 : s.length)
}

/** SPEC-SER-03: série de um SKU na granularidade pedida. */
export function seriesFor(records: readonly SaleRecord[], sku: string, freq: Freq): Series {
  const pts: { date: string; value: number }[] = []
  let first = ''
  let last = ''
  for (const r of records) {
    if (r.sku !== sku) continue
    pts.push({ date: r.data, value: r.quantidade_vendida })
    if (first === '' || r.data < first) first = r.data
    if (last === '' || r.data > last) last = r.data
  }
  if (pts.length === 0) return []
  return trimPartialPeriods(resample(pts, freq), freq, first, last)
}

/** SPEC-SER-06: pontos com `inicio ≤ rótulo ≤ fim`. */
export function sliceByDates(s: Series, inicio: string, fim: string): Series {
  return s.filter((p) => p.date >= inicio && p.date <= fim)
}

export const valuesOf = (s: Series): number[] => s.map((p) => p.value)
