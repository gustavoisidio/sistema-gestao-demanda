import { addDays, endOfMonth } from '../../lib/dates'
import { mean, sum } from '../../lib/stats'
import type { SaleRecord } from '../../types'
import { listSkus } from '../data/summary'
import { resample } from '../series/aggregate'

/** SPEC-DSH-01: SKUs escolhidos (vazio = todos) e intervalo inclusivo; intervalo incompleto = base inteira. */
export function filterBase(records: readonly SaleRecord[], skus: readonly string[], ini?: string, fim?: string): SaleRecord[] {
  const all = new Set(listSkus(records))
  const chosen = skus.length ? new Set(skus) : all
  const dates = records.map((r) => r.data).sort()
  const lo = ini && fim ? ini : dates[0]
  const hi = ini && fim ? fim : dates[dates.length - 1]
  return records.filter((r) => chosen.has(r.sku) && r.data >= lo && r.data <= hi)
}

const sumBetween = (records: readonly SaleRecord[], exclusiveFrom: string, inclusiveTo: string) =>
  sum(records.filter((r) => r.data > exclusiveFrom && r.data <= inclusiveTo).map((r) => r.quantidade_vendida))

export interface DashboardKpis {
  ultimo: string
  volume: number
  r30: number
  delta30: number | null
  ano: number
  yoy: number | null
  mediaDiaria: number
  campeao: string
  participacao: number
  /** soma por mês completo (rótulo = fim do mês), para o mini gráfico */
  mensal: number[]
}

/** SPEC-DSH-02 */
export function dashboardKpis(base: readonly SaleRecord[]): DashboardKpis | null {
  if (base.length === 0) return null
  const ultimo = base.reduce((m, r) => (r.data > m ? r.data : m), base[0].data)
  const r30 = sumBetween(base, addDays(ultimo, -30), ultimo)
  const p30 = sumBetween(base, addDays(ultimo, -60), addDays(ultimo, -30))
  const ano = sumBetween(base, addDays(ultimo, -365), ultimo)
  const anoAnt = sumBetween(base, addDays(ultimo, -730), addDays(ultimo, -365))
  const bySku = volumeBySku(base)
  const porData = new Map<string, number>()
  for (const r of base) porData.set(r.data, (porData.get(r.data) ?? 0) + r.quantidade_vendida)
  const total = sum(base.map((r) => r.quantidade_vendida))
  return {
    ultimo,
    volume: total,
    r30,
    delta30: p30 ? ((r30 - p30) / p30) * 100 : null,
    ano,
    yoy: anoAnt ? ((ano - anoAnt) / anoAnt) * 100 : null,
    mediaDiaria: mean([...porData.values()]),
    campeao: bySku[0].sku,
    participacao: total ? (bySku[0].volume / total) * 100 : 0,
    mensal: resample(base.map((r) => ({ date: r.data, value: r.quantidade_vendida })), 'ME')
      .filter((p) => p.date <= ultimo)
      .map((p) => p.value),
  }
}

export interface SkuVolume {
  sku: string
  volume: number
  /** posição do SKU na lista completa da base (cor estável com filtros) */
  colorIndex: number
}

/** SPEC-DSH-03: volume por SKU em ordem decrescente. `allSkus` define a cor de cada SKU. */
export function volumeBySku(base: readonly SaleRecord[], allSkus: readonly string[] = listSkus(base)): SkuVolume[] {
  const m = new Map<string, number>()
  for (const r of base) m.set(r.sku, (m.get(r.sku) ?? 0) + r.quantidade_vendida)
  return [...m.entries()]
    .map(([sku, volume]) => ({ sku, volume, colorIndex: Math.max(0, allSkus.indexOf(sku)) }))
    .sort((a, b) => b.volume - a.volume)
}

export interface MonthlyTable {
  months: string[]
  skus: string[]
  /** `values[sku][i]` = soma do SKU no mês `months[i]`, ou null se não houve registro */
  values: Record<string, (number | null)[]>
}

/** SPEC-DSH-04: soma por (mês, SKU), omitindo meses cujo fim é posterior ao último dia dos dados. */
export function monthlyBySku(base: readonly SaleRecord[], ultimo: string): MonthlyTable {
  const cells = new Map<string, number>()
  const monthSet = new Set<string>()
  for (const r of base) {
    const m = endOfMonth(r.data)
    if (m > ultimo) continue
    monthSet.add(m)
    const key = `${r.sku}\u0000${m}`
    cells.set(key, (cells.get(key) ?? 0) + r.quantidade_vendida)
  }
  const months = [...monthSet].sort()
  const skus = listSkus(base)
  const values: MonthlyTable['values'] = {}
  for (const sku of skus) values[sku] = months.map((m) => cells.get(`${sku}\u0000${m}`) ?? null)
  return { months, skus, values }
}

/** Participação % de cada mês (modo "Participação %"). */
export function shareByMonth(t: MonthlyTable): Record<string, (number | null)[]> {
  const totals = t.months.map((_, i) => sum(t.skus.map((s) => t.values[s][i] ?? 0)))
  return Object.fromEntries(t.skus.map((s) => [s, t.values[s].map((v, i) => (v === null || !totals[i] ? null : (v / totals[i]) * 100))]))
}

/** SPEC-DSH-05: índice do mês em relação à média do próprio SKU (100 = média). */
export function intensityIndex(t: MonthlyTable): Record<string, (number | null)[]> {
  return Object.fromEntries(
    t.skus.map((s) => {
      const present = t.values[s].filter((v): v is number => v !== null)
      const avg = present.length ? mean(present) : 0
      return [s, t.values[s].map((v) => (v === null || !avg ? null : (v / avg) * 100))]
    }),
  )
}

