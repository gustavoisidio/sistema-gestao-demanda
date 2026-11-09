import { sum } from '../../lib/stats'
import { MODEL_NAMES, type Freq, type Metrics, type ModelName, type Series } from '../../types'
import { runAll } from '../forecasting'
import { SEASON } from '../series/params'
import { calculateMetrics } from './metrics'

export interface BacktestRow extends Metrics {
  Posição: number
  Modelo: ModelName
  /** `max(0, 100 − WAPE)`; NaN quando o WAPE é indefinido */
  'Acurácia (%)': number
}

export interface BacktestResult {
  table: BacktestRow[]
  forecasts: Partial<Record<ModelName, number[]>>
  train: Series
  test: Series
}

const wapeKey = 'WAPE (%)' as const

/** SPEC-EVL-02 / SPEC-EVL-03: treina com o passado e mede o erro nos últimos `h` períodos. */
export function backtest(series: Series, h: number, m: number): BacktestResult {
  const train = series.slice(0, series.length - h)
  const test = series.slice(series.length - h)
  const testValues = test.map((p) => p.value)
  const results = runAll(train.map((p) => p.value), h, m)

  const forecasts: Partial<Record<ModelName, number[]>> = {}
  const rows: Omit<BacktestRow, 'Posição'>[] = []
  for (const name of MODEL_NAMES) {
    const r = results[name]
    if (!r || r.forecast.length !== testValues.length) continue
    const fc = r.forecast.map((v) => Math.max(0, v))
    forecasts[name] = fc
    const metrics = calculateMetrics(testValues, fc)
    rows.push({ Modelo: name, ...metrics, 'Acurácia (%)': Math.max(0, 100 - metrics[wapeKey]) })
  }

  // WAPE crescente, NaN por último; empate preserva a ordem de `runAll`
  const ordered = rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const x = a.row[wapeKey]
      const y = b.row[wapeKey]
      if (Number.isNaN(x) && Number.isNaN(y)) return a.i - b.i
      if (Number.isNaN(x)) return 1
      if (Number.isNaN(y)) return -1
      return x - y || a.i - b.i
    })
    .map(({ row }, idx) => ({ Posição: idx + 1, ...row }))

  return { table: ordered, forecasts, train, test }
}

export interface BestModel {
  modelo: ModelName | null
  tabela: BacktestRow[]
  /** horizonte efetivamente usado no backtest */
  hBacktest: number
  /** soma dos valores reais do teste (base do viés percentual do laudo) */
  totalReal: number
}

/** SPEC-EVL-04: única regra de "melhor modelo" (Previsão, laudo e portfólio). */
export function bestModel(series: Series, freq: Freq, h?: number): BestModel {
  const n = series.length
  let hBt = h ?? Math.min(Math.max(Math.floor(n * 0.2), 3), 12)
  hBt = Math.min(hBt, Math.max(n - 4, 1))
  if (n < 6) return { modelo: null, tabela: [], hBacktest: hBt, totalReal: 0 }
  const bt = backtest(series, hBt, SEASON[freq])
  return {
    modelo: bt.table[0]?.Modelo ?? null,
    tabela: bt.table,
    hBacktest: hBt,
    totalReal: sum(bt.test.map((p) => p.value)),
  }
}

/** SPEC-EVL-05: quanto o vencedor erra menos que o Naive (%), ou null. */
export function gainOverNaive(table: readonly BacktestRow[]): number | null {
  const top = table[0]
  const naive = table.find((r) => r.Modelo === 'Naive')
  if (!top || !naive || top.Modelo === 'Naive' || !(naive[wapeKey] > 0)) return null
  return ((naive[wapeKey] - top[wapeKey]) / naive[wapeKey]) * 100
}
