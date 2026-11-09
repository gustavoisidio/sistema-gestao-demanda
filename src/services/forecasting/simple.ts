import { mean, olsLine } from '../../lib/stats'
import type { ModelFit } from '../../types'

const repeat = (value: number, h: number) => new Array<number>(h).fill(value)

/** SPEC-FCS-01 */
export function naive(y: readonly number[], h: number): ModelFit {
  return { fit: y.map((_, t) => (t === 0 ? y[0] : y[t - 1])), forecast: repeat(y[y.length - 1], h) }
}

/**
 * SPEC-FCS-02: média móvel. O ajuste é a média móvel deslocada em 1 período e preenchida para trás,
 * e a previsão é o último valor ajustado — a média de y[n-w-1 … n-2] (particularidade P1 do original).
 */
export function simpleMovingAverage(y: readonly number[], h: number, window = 3): ModelFit | null {
  const n = y.length
  if (n < window) return null
  const rolling: number[] = []
  for (let t = window - 1; t < n; t++) rolling.push(mean(y.slice(t - window + 1, t + 1)))
  // fitted[t] = rolling[t-1] para t >= window; antes disso, o primeiro valor disponível (bfill)
  const fit = y.map((_, t) => (t < window ? rolling[0] : rolling[t - window]))
  return { fit, forecast: repeat(fit[n - 1], h) }
}

/** Nível inicial do statsmodels para "estimated" sem otimização (SPEC-FCS-03). */
function sesInitialLevel(y: readonly number[]): number {
  if (y.length < 10) return y[0]
  const { intercept, slope } = olsLine(y.slice(0, 10))
  return intercept - slope
}

/** SPEC-FCS-03: suavização exponencial simples com α = 0,2 fixo. */
export function ses(y: readonly number[], h: number, alpha = 0.2): ModelFit {
  let level = sesInitialLevel(y)
  const fit: number[] = []
  for (const v of y) {
    fit.push(level)
    level = alpha * v + (1 - alpha) * level
  }
  return { fit, forecast: repeat(level, h) }
}

/** SPEC-FCS-06: reta de mínimos quadrados, com piso em 0. */
export function linearRegression(y: readonly number[], h: number): ModelFit {
  const n = y.length
  const { intercept, slope } = olsLine(y)
  return {
    fit: y.map((_, t) => Math.max(0, intercept + slope * t)),
    forecast: Array.from({ length: h }, (_, k) => Math.max(0, intercept + slope * (n + k))),
  }
}

/** SPEC-FCS-07: Croston (α = 0,1) para demanda intermitente. */
export function croston(y: readonly number[], h: number): ModelFit {
  const n = y.length
  const first = y.findIndex((v) => v > 0)
  if (first === -1) return { fit: [...y], forecast: repeat(0, h) }
  const alpha = 0.1
  const level = new Array<number>(n).fill(0)
  const period = new Array<number>(n).fill(0)
  const fit = new Array<number>(n).fill(0)
  let q = 1
  level[0] = y[first]
  period[0] = first === 0 ? 1 : first
  fit[0] = level[0] / period[0]
  for (let t = 1; t < n; t++) {
    if (y[t] > 0) {
      level[t] = alpha * y[t] + (1 - alpha) * level[t - 1]
      period[t] = alpha * q + (1 - alpha) * period[t - 1]
      q = 1
    } else {
      level[t] = level[t - 1]
      period[t] = period[t - 1]
      q += 1
    }
    fit[t] = level[t] / period[t]
  }
  const next = period[n - 1] > 0 ? level[n - 1] / period[n - 1] : 0
  return { fit, forecast: repeat(next, h) }
}
