import { monthOf, quarterOf, weekdayMon0, yearOf } from '../../lib/dates'
import { mean, quantile } from '../../lib/stats'
import { resample } from '../series/aggregate'
import type { SaleRecord, Series } from '../../types'

/** Registros diários de um SKU numa janela de datas (inclusiva). */
export function dailyRecords(records: readonly SaleRecord[], sku: string, inicio: string, fim: string): SaleRecord[] {
  return records.filter((r) => r.sku === sku && r.data >= inicio && r.data <= fim)
}

export interface MonthlyMatrix {
  years: number[]
  /** `matrix[i][m]`: soma do mês `m + 1` do ano `years[i]`; `null` onde não há mês na série. */
  matrix: (number | null)[][]
}

/** SPEC-EDA-09: soma mensal por ano × mês. */
export function monthlyByYear(daily: readonly SaleRecord[]): MonthlyMatrix {
  const months = resample(daily.map((r) => ({ date: r.data, value: r.quantidade_vendida })), 'ME')
  const years = [...new Set(months.map((p) => yearOf(p.date)))].sort((a, b) => a - b)
  const matrix = years.map((y) => {
    const row: (number | null)[] = new Array(12).fill(null)
    for (const p of months) if (yearOf(p.date) === y) row[monthOf(p.date) - 1] = p.value
    return row
  })
  return { years, matrix }
}

/** SPEC-EDA-10: índice de cada dia da semana (segunda = 0) em relação à média das médias. */
export function weekdayIndex(daily: readonly SaleRecord[]): (number | null)[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => [])
  for (const r of daily) buckets[weekdayMon0(r.data)].push(r.quantidade_vendida)
  const means = buckets.map((b) => (b.length ? mean(b) : null))
  const present = means.filter((m): m is number => m !== null)
  const overall = present.length ? mean(present) : 0
  return overall ? means.map((m) => (m === null ? null : (m / overall) * 100)) : means
}

export interface HistogramBin {
  x0: number
  x1: number
  count: number
}

/** SPEC-EDA-11: classes de largura igual entre mínimo e máximo. */
export function histogram(values: readonly number[], bins = 30): HistogramBin[] {
  if (values.length === 0) return []
  let lo = Infinity
  let hi = -Infinity
  for (const v of values) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  if (lo === hi) return [{ x0: lo, x1: hi, count: values.length }]
  const width = (hi - lo) / bins
  const out: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({ x0: lo + i * width, x1: lo + (i + 1) * width, count: 0 }))
  for (const v of values) out[Math.min(bins - 1, Math.floor((v - lo) / width))].count++
  return out
}

export interface BoxStats {
  quarter: 'T1' | 'T2' | 'T3' | 'T4'
  min: number
  q1: number
  median: number
  q3: number
  max: number
  whiskerLow: number
  whiskerHigh: number
  outliers: number[]
}

/** SPEC-EDA-12: caixa por trimestre do calendário (quartis por interpolação linear). */
export function quarterBoxStats(serie: Series): BoxStats[] {
  const out: BoxStats[] = []
  for (const q of [1, 2, 3, 4] as const) {
    const values = serie.filter((p) => quarterOf(p.date) === q).map((p) => p.value).sort((a, b) => a - b)
    if (values.length === 0) continue
    const q1 = quantile(values, 0.25)
    const q3 = quantile(values, 0.75)
    const iqr = q3 - q1
    const inside = values.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
    out.push({
      quarter: `T${q}`,
      min: values[0],
      q1,
      median: quantile(values, 0.5),
      q3,
      max: values[values.length - 1],
      whiskerLow: inside[0],
      whiskerHigh: inside[inside.length - 1],
      outliers: values.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr),
    })
  }
  return out
}
