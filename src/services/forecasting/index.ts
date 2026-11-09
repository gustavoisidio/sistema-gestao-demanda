import { nanStd } from '../../lib/stats'
import { MODEL_NAMES, type ModelFit, type ModelName, type ModelResult } from '../../types'
import { holt, holtWinters } from './ets'
import { croston, linearRegression, naive, simpleMovingAverage, ses } from './simple'

export { holt, holtWinters, croston, linearRegression, naive, simpleMovingAverage, ses }

function validInput(y: readonly number[], h: number): boolean {
  return y.length > 0 && h >= 1 && y.every(Number.isFinite)
}

/** SPEC-FCS-08: roda os 7 modelos na ordem do original; indisponíveis ou com erro são omitidos. */
export function runAll(y: readonly number[], h: number, m = 12): Partial<Record<ModelName, ModelFit>> {
  if (!validInput(y, h)) return {}
  const runners: Record<ModelName, () => ModelFit | null> = {
    Naive: () => naive(y, h),
    'Média Móvel': () => simpleMovingAverage(y, h),
    SES: () => ses(y, h),
    Holt: () => holt(y, h),
    'Holt-Winters': () => holtWinters(y, h, m),
    Regressão: () => linearRegression(y, h),
    Croston: () => croston(y, h),
  }
  const out: Partial<Record<ModelName, ModelFit>> = {}
  for (const name of MODEL_NAMES) {
    try {
      const r = runners[name]()
      if (r && r.forecast.every(Number.isFinite)) out[name] = r
    } catch {
      /* modelo omitido: nunca derruba a tela */
    }
  }
  return out
}

/** Modelos que `runAll` consegue ajustar para uma série de `n` pontos (sem rodar nada). */
export function availableModels(n: number, m: number): ModelName[] {
  if (n < 1) return []
  return MODEL_NAMES.filter((name) => (name === 'Média Móvel' ? n >= 3 : name === 'Holt' ? n >= 2 : name === 'Holt-Winters' ? m >= 2 && n >= 2 * m : true))
}

/** Nomes dos modelos presentes, na ordem de `runAll`. */
export function modelOrder(results: Partial<Record<ModelName, unknown>>): ModelName[] {
  return MODEL_NAMES.filter((n) => n in results)
}

/** SPEC-FCS-09: previsão limitada a ≥ 0 e desvio dos resíduos para os intervalos. */
export function runModels(y: readonly number[], h: number, m: number): Partial<Record<ModelName, ModelResult>> {
  const out: Partial<Record<ModelName, ModelResult>> = {}
  const all = runAll(y, h, m)
  for (const name of modelOrder(all)) {
    const { fit, forecast } = all[name]!
    const clipped = forecast.map((v) => Math.max(0, v))
    const resid = y.map((v, t) => v - fit[t]).slice(1)
    out[name] = { fit, forecast: clipped, sigma: resid.length > 1 ? nanStd(resid, 0) : 0 }
  }
  return out
}

export type ConfidenceLevel = '80%' | '95%'

/** SPEC-FCS-12: faixa `fc ± z·σ·min(√passo, 3)`, com piso em 0 no limite inferior. */
export function confidenceBand(forecast: readonly number[], sigma: number, level: ConfidenceLevel): { inf: number[]; sup: number[] } {
  const z = level === '80%' ? 1.2816 : 1.96
  const factor = (i: number) => Math.min(Math.sqrt(i + 1), 3)
  return {
    inf: forecast.map((f, i) => Math.max(0, f - z * sigma * factor(i))),
    sup: forecast.map((f, i) => f + z * sigma * factor(i)),
  }
}
