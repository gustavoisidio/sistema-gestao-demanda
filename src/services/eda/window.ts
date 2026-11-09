import { mean, olsLine, std, sum } from '../../lib/stats'
import type { Series } from '../../types'
import { growthPct } from './indicators'

export interface WindowStats {
  volume: number
  media: number
  pico: { value: number; date: string } | null
  cv: number
  crescimentoPct: number
  pctZerados: number
}

/** SPEC-EDA-06: KPIs da tela Análise histórica, sobre os pontos da janela. */
export function windowStats(serie: Series): WindowStats {
  const values = serie.map((p) => p.value)
  const media = mean(values)
  let pico: WindowStats['pico'] = null
  for (const p of serie) if (pico === null || p.value > pico.value) pico = { value: p.value, date: p.date }
  return {
    volume: sum(values),
    media,
    pico,
    cv: media > 0 ? std(values, 1) / media : 0,
    crescimentoPct: growthPct(values),
    pctZerados: values.length === 0 ? NaN : (values.filter((v) => v === 0).length / values.length) * 100,
  }
}

/** SPEC-EDA-07: média móvel com `min_periods = 1`. */
export function rollingMean(values: readonly number[], janela: number): number[] {
  return values.map((_, i) => mean(values.slice(Math.max(0, i - janela + 1), i + 1)))
}

/** Janela da média móvel por granularidade (SPEC-EDA-07). */
export const ROLLING_WINDOW = { D: 28, W: 8, ME: 3 } as const

/** SPEC-EDA-08: reta de mínimos quadrados sobre 0…n−1; com n ≤ 1 devolve os próprios valores. */
export function linearTrend(values: readonly number[]): number[] {
  if (values.length <= 1) return [...values]
  const { intercept, slope } = olsLine(values)
  return values.map((_, t) => intercept + slope * t)
}
