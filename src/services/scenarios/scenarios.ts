import { sum } from '../../lib/stats'

/** SPEC-SCN-01 */
export function applyLinear(forecast: readonly number[], pct: number): number[] {
  return forecast.map((v) => v * (1 + pct / 100))
}

/** SPEC-SCN-02: índices fora do intervalo são ignorados. */
export function applyPromotion(forecast: readonly number[], indices: readonly number[], pct: number): number[] {
  const out = [...forecast]
  for (const i of indices) if (i >= 0 && i < out.length) out[i] *= 1 + pct / 100
  return out
}

/** SPEC-SCN-04 */
export function defaultPromoWeeks(h: number): number[] {
  return [4, 8].filter((w) => w <= h)
}

export function clampPromoWeeks(weeks: readonly number[], h: number): number[] {
  return weeks.filter((w) => w <= h)
}

export interface Scenario {
  cenario: number[]
  efeito: number[]
  volumeBase: number
  volumeCenario: number
  incremental: number
  variacaoPct: number
  picoValor: number
  picoIndice: number
}

/** SPEC-SCN-03: choque global e depois promoção nas semanas escolhidas (numeradas a partir de 1). */
export function buildScenario(base: readonly number[], choquePct: number, semanasPromo: readonly number[], upliftPct: number): Scenario {
  const cenario = applyPromotion(applyLinear(base, choquePct), semanasPromo.map((s) => s - 1), upliftPct)
  const volumeBase = sum(base)
  const volumeCenario = sum(cenario)
  let picoIndice = 0
  cenario.forEach((v, i) => {
    if (v > cenario[picoIndice]) picoIndice = i
  })
  return {
    cenario,
    efeito: cenario.map((v, i) => v - base[i]),
    volumeBase,
    volumeCenario,
    incremental: volumeCenario - volumeBase,
    variacaoPct: volumeBase ? ((volumeCenario - volumeBase) / volumeBase) * 100 : 0,
    picoValor: cenario[picoIndice] ?? 0,
    picoIndice,
  }
}

export interface ScenarioRow {
  semana: string
  data: string
  base: number
  cenario: number
  promocao: boolean
  variacaoPct: number
}

/** SPEC-SCN-05 */
export function scenarioTable(base: readonly number[], cenario: readonly number[], datas: readonly string[], semanasPromo: readonly number[]): ScenarioRow[] {
  return base.map((b, i) => {
    const rb = Math.round(b)
    const rc = Math.round(cenario[i])
    return {
      semana: `Semana ${i + 1}`,
      data: datas[i],
      base: rb,
      cenario: rc,
      promocao: semanasPromo.includes(i + 1),
      variacaoPct: rb > 0 ? ((rc - rb) / rb) * 100 : 0,
    }
  })
}
