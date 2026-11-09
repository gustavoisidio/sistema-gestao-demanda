import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { seriesFor } from '../series/aggregate'
import { SEASON } from '../series/params'
import { backtest, bestModel, gainOverNaive, type BacktestRow } from './backtest'
import { calculateMetrics, trackingSignalStatus } from './metrics'
import type { Freq, Series } from '../../types'
import metricsGolden from '../__golden__/metrics.json'
import btGolden from '../__golden__/backtest.json'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const toSeries = (vals: number[]): Series => vals.map((value, i) => ({ date: `2025-01-${String(i + 1).padStart(2, '0')}`, value }))

describe('calculateMetrics (SPEC-EVL-01)', () => {
  it.each(metricsGolden.map((c, i) => [i, c] as const))('caso %i bate com o evaluator.py', (_i, c) => {
    const m = calculateMetrics(c.real, c.pred)
    for (const [k, v] of Object.entries(c.metrics)) {
      const mine = m[k as keyof typeof m]
      if (v === null) expect(Number.isNaN(mine)).toBe(true)
      else expect(mine).toBeCloseTo(v as number, 10)
    }
  })

  it('previsão perfeita: erros e viés zero, TS = 0', () => {
    const m = calculateMetrics([100, 100, 100], [100, 100, 100])
    expect([m.MAE, m.RMSE, m['Viés (Bias)'], m['Tracking Signal'], m['WAPE (%)']]).toEqual([0, 0, 0, 0, 0])
  })

  it('real todo zero: MAPE e WAPE indefinidos', () => {
    const m = calculateMetrics([0, 0, 0], [1, 2, 3])
    expect(Number.isNaN(m['MAPE (%)'])).toBe(true)
    expect(Number.isNaN(m['WAPE (%)'])).toBe(true)
    expect(m['Viés (Bias)']).toBe(6)
  })
})

describe('trackingSignalStatus (SPEC-EVL-06)', () => {
  it('|TS| > 4 é viés; 4 exato é controle', () => {
    expect(trackingSignalStatus(4.01)).toBe('viés')
    expect(trackingSignalStatus(-4.01)).toBe('viés')
    expect(trackingSignalStatus(4)).toBe('controle')
    expect(trackingSignalStatus(0)).toBe('controle')
  })
})

describe('backtest (SPEC-EVL-02, SPEC-EVL-03)', () => {
  it('separa treino e teste e ordena por WAPE com posições 1…k', () => {
    const series = seriesFor(records, 'Smartphone TechX', 'ME')
    const bt = backtest(series, 6, SEASON.ME)
    expect(bt.train).toHaveLength(series.length - 6)
    expect(bt.test).toHaveLength(6)
    expect(bt.table.map((r) => r.Posição)).toEqual(bt.table.map((_, i) => i + 1))
    const wapes = bt.table.map((r) => r['WAPE (%)'])
    expect([...wapes].sort((a, b) => a - b)).toEqual(wapes)
    expect(bt.table.every((r) => r['Acurácia (%)'] === Math.max(0, 100 - r['WAPE (%)']))).toBe(true)
  })

  it('h ≥ n → sem modelos', () => {
    expect(backtest(toSeries([1, 2, 3]), 3, 12).table).toEqual([])
  })

  it('WAPE indefinido vai para o fim e a acurácia fica indefinida', () => {
    const bt = backtest(toSeries([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 3, 12)
    expect(bt.table.length).toBeGreaterThan(0)
    expect(bt.table.every((r) => Number.isNaN(r['WAPE (%)']) && Number.isNaN(r['Acurácia (%)']))).toBe(true)
  })

  type GoldenRow = Record<string, number | string | null>
  const BT = btGolden as unknown as Record<string, Record<Freq, { explicit_h: number; explicit_table: GoldenRow[]; best: string; h_bt: number; best_table: GoldenRow[] }>>

  for (const sku of listSkus(records)) {
    for (const freq of ['ME', 'W'] as Freq[]) {
      it(`ranking de ${sku} · ${freq} bate com o Python (WAPE exato nos determinísticos)`, () => {
        const ref = BT[sku][freq]
        const bt = backtest(seriesFor(records, sku, freq), ref.explicit_h, SEASON[freq])
        expect(bt.table.map((r) => r.Modelo).sort()).toEqual(ref.explicit_table.map((r) => r.Modelo as string).sort())
        for (const row of bt.table) {
          const r = ref.explicit_table.find((x) => x.Modelo === row.Modelo)!
          const exact = ['Naive', 'Média Móvel', 'SES', 'Regressão', 'Croston'].includes(row.Modelo)
          const mine = row['WAPE (%)']
          const theirs = r['WAPE (%)'] as number | null
          if (theirs === null) expect(Number.isNaN(mine)).toBe(true)
          else if (exact) expect(mine).toBeCloseTo(theirs, 8)
          else expect(Number.isFinite(mine)).toBe(true) // Holt/HW: previsão difere do statsmodels (SPEC-FCS-10); só exige WAPE válido
        }
      })
    }
  }
})

describe('bestModel (SPEC-EVL-04)', () => {
  it('h_bt = min(max(⌊0,2n⌋, 3), 12), limitado por n − 4', () => {
    const s = (n: number) => toSeries(Array.from({ length: n }, (_, i) => 10 + (i % 5)))
    expect(bestModel(s(20), 'ME').hBacktest).toBe(4)
    expect(bestModel(s(100), 'ME').hBacktest).toBe(12)
    expect(bestModel(s(10), 'ME').hBacktest).toBe(3)
    expect(bestModel(s(6), 'ME').hBacktest).toBe(2) // 3 → limitado por n − 4
    expect(bestModel(s(20), 'ME', 15).hBacktest).toBe(15)
    expect(bestModel(s(20), 'ME', 99).hBacktest).toBe(16)
  })

  it('n < 6 → sem melhor modelo', () => {
    const r = bestModel(toSeries([1, 2, 3, 4, 5]), 'ME')
    expect(r).toMatchObject({ modelo: null, tabela: [] })
  })

  it('o primeiro do ranking é o melhor; totalReal é a soma do teste', () => {
    const series = seriesFor(records, 'Placa Mae Servidor', 'W')
    const r = bestModel(series, 'W')
    expect(r.modelo).toBe(r.tabela[0].Modelo)
    expect(r.totalReal).toBe(series.slice(-r.hBacktest).reduce((a, p) => a + p.value, 0))
  })

  for (const sku of listSkus(records)) {
    it(`h do backtest de ${sku} bate com o Python (W e ME)`, () => {
      for (const freq of ['W', 'ME'] as Freq[]) {
        expect(bestModel(seriesFor(records, sku, freq), freq).hBacktest).toBe(BT2[sku][freq].h_bt)
      }
    })
  }

  it('modelo recomendado = referência quando o vencedor é determinístico (ou a tabela explica a diferença)', () => {
    const diffs: string[] = []
    for (const sku of listSkus(records)) {
      for (const freq of ['W', 'ME'] as Freq[]) {
        const mine = bestModel(seriesFor(records, sku, freq), freq).modelo
        if (mine !== BT2[sku][freq].best) diffs.push(`${sku}/${freq}: ${mine} ≠ ${BT2[sku][freq].best}`)
      }
    }
    // Holt e Holt-Winters não são idênticos ao statsmodels (SPEC-FCS-10): divergências só podem envolver esses modelos
    for (const d of diffs) expect(/Holt/.test(d)).toBe(true)
  })
})

const BT2 = btGolden as unknown as Record<string, Record<Freq, { best: string; h_bt: number }>>

describe('gainOverNaive (SPEC-EVL-05)', () => {
  const row = (Modelo: BacktestRow['Modelo'], wape: number) => ({ Modelo, 'WAPE (%)': wape }) as BacktestRow
  it('calcula o ganho sobre o Naive', () => {
    expect(gainOverNaive([row('SES', 10), row('Naive', 20)])).toBeCloseTo(50, 10)
  })
  it('null quando o Naive vence, não existe ou tem WAPE 0', () => {
    expect(gainOverNaive([row('Naive', 10), row('SES', 20)])).toBeNull()
    expect(gainOverNaive([row('SES', 10)])).toBeNull()
    expect(gainOverNaive([row('SES', 0), row('Naive', 0)])).toBeNull()
    expect(gainOverNaive([])).toBeNull()
  })
})
