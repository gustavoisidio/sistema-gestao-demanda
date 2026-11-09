import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { dashboardKpis, filterBase, intensityIndex, monthlyBySku, shareByMonth, volumeBySku } from './dashboard'
import golden from '../__golden__/dashboard.json'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const rec = (sku: string, data: string, q: number) => ({ sku, data, quantidade_vendida: q })

describe('filterBase (SPEC-DSH-01)', () => {
  it('SKUs vazios = todos; intervalo inclusivo', () => {
    expect(filterBase(records, [], '2024-01-01', '2024-01-31')).toHaveLength(31 * 5)
    expect(filterBase(records, ['Smartphone TechX'], '2024-01-01', '2024-01-31')).toHaveLength(31)
  })
  it('intervalo incompleto usa a base inteira', () => {
    expect(filterBase(records, [], '2024-01-01', undefined)).toHaveLength(records.length)
    expect(filterBase(records, ['Smartphone TechX'])).toHaveLength(1456)
  })
})

describe('dashboardKpis (SPEC-DSH-02)', () => {
  const k = dashboardKpis(records)!
  it('bate com o Python original', () => {
    expect(k.ultimo).toBe(golden.ultimo)
    expect(k.r30).toBe(golden.r30)
    expect(k.delta30).toBeCloseTo(((golden.r30 - golden.p30) / golden.p30) * 100, 10)
    expect(k.ano).toBe(golden.ano)
    expect(k.yoy).toBeCloseTo(((golden.ano - golden.ano_ant) / golden.ano_ant) * 100, 10)
    expect(k.mediaDiaria).toBeCloseTo(golden.diario_media, 8)
    expect(k.mensal).toEqual(golden.mensal)
    expect(k.campeao).toBe(Object.keys(golden.por_sku)[0])
  })
  it('deltas nulos sem período anterior; base vazia → null', () => {
    const k2 = dashboardKpis([rec('A', '2025-01-10', 5)])!
    expect([k2.delta30, k2.yoy]).toEqual([null, null])
    expect(dashboardKpis([])).toBeNull()
  })
})

describe('volumeBySku (SPEC-DSH-03)', () => {
  it('ordem decrescente e cor estável pela posição na lista completa', () => {
    const all = listSkus(records)
    const v = volumeBySku(records, all)
    expect(v.map((x) => x.sku)).toEqual(Object.keys(golden.por_sku))
    const only = volumeBySku(filterBase(records, [all[3]]), all)
    expect(only[0].colorIndex).toBe(3)
  })
})

describe('evolução mensal e intensidade (SPEC-DSH-04, SPEC-DSH-05)', () => {
  const t = monthlyBySku(records, golden.ultimo)
  it('omite o mês final incompleto (dez/2026) e mantém os 47 meses completos', () => {
    expect(t.months[0]).toBe('2023-01-31')
    expect(t.months[t.months.length - 1]).toBe('2026-11-30')
    expect(t.months).toHaveLength(47)
  })
  it('intensidade bate com o Python (primeiro SKU)', () => {
    const idx = intensityIndex(t)[golden.intensity_sku]
    idx.forEach((v, i) => expect(v!).toBeCloseTo(golden.intensity_first_sku[i], 8))
  })
  it('participação soma 100 por mês', () => {
    const share = shareByMonth(t)
    const total = t.skus.reduce((a, s) => a + (share[s][10] ?? 0), 0)
    expect(total).toBeCloseTo(100, 8)
  })
  it('SKU sem registro no mês fica nulo e SKU de média zero não gera índice', () => {
    const small = monthlyBySku([rec('A', '2025-01-10', 0), rec('B', '2025-02-10', 4)], '2025-02-28')
    expect(small.values.A).toEqual([0, null])
    expect(intensityIndex(small).A).toEqual([null, null])
  })
})
