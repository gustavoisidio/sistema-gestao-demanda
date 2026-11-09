// Holt (tendência aditiva) e Holt-Winters (tendência e sazonalidade aditivas) — SPEC-FCS-04, 05, 10.
//
// Forma de correção de erro (equivalente à do statsmodels):
//   ŷ[t] = l + b + s[t−m];  e[t] = y[t] − ŷ[t]
//   l ← l + b + α·e;  b ← b + α·β·e;  s[t] = s[t−m] + γ·e
// O modelo é linear nos estados iniciais (l0, b0, s0…). Para parâmetros (α, β, γ) fixos, o SSE é uma
// quadrática em x0 e a solução sai de mínimos quadrados; só α, β, γ são buscados (Nelder–Mead).

import { solveLinear } from '../../lib/stats'
import { multiStartNelderMead } from '../../lib/optimize'
import type { ModelFit } from '../../types'

interface Smoothing {
  alpha: number
  beta: number
  gamma: number
}

/** Roda a recursão. `y = null` equivale a uma série de zeros. Devolve os erros de 1 passo e o estado final. */
function simulate(
  y: Float64Array | null,
  n: number,
  m: number,
  p: Smoothing,
  l0: number,
  b0: number,
  s0: Float64Array | null,
  errors: Float64Array,
  fitted?: Float64Array,
): { level: number; trend: number; seasonal: Float64Array | null } {
  let level = l0
  let trend = b0
  const s = s0 ? Float64Array.from(s0) : null
  const ab = p.alpha * p.beta
  for (let t = 0; t < n; t++) {
    const si = s ? t % m : 0
    const pred = level + trend + (s ? s[si] : 0)
    const e = (y ? y[t] : 0) - pred
    errors[t] = e
    if (fitted) fitted[t] = pred
    level = level + trend + p.alpha * e
    trend = trend + ab * e
    if (s) s[si] += p.gamma * e
  }
  return { level, trend, seasonal: s }
}

interface Layout {
  /** número de colunas de x0: l0, b0 e (m − 1) sazonais livres */
  d: number
  /** estado inicial (l0, b0, s0) correspondente a um vetor de coeficientes */
  expand: (x: ArrayLike<number>) => { l0: number; b0: number; s0: Float64Array | null }
}

function layout(m: number): Layout {
  if (m === 0) return { d: 2, expand: (x) => ({ l0: x[0], b0: x[1], s0: null }) }
  return {
    d: m + 1,
    expand: (x) => {
      const s0 = new Float64Array(m)
      let acc = 0
      for (let j = 0; j < m - 1; j++) {
        s0[j] = x[2 + j]
        acc += x[2 + j]
      }
      s0[m - 1] = -acc // Σ s0 = 0
      return { l0: x[0], b0: x[1], s0 }
    },
  }
}

/** Estados iniciais ótimos (mínimos quadrados) para um conjunto fixo de parâmetros; null se singular. */
function solveInitialState(y: Float64Array, n: number, m: number, p: Smoothing, lay: Layout): number[] | null {
  const { d } = lay
  const e0 = new Float64Array(n)
  simulate(y, n, m, p, 0, 0, m ? new Float64Array(m) : null, e0)

  const cols: Float64Array[] = []
  for (let j = 0; j < d; j++) {
    const basis = new Array<number>(d).fill(0)
    basis[j] = 1
    const { l0, b0, s0 } = lay.expand(basis)
    const col = new Float64Array(n)
    simulate(null, n, m, p, l0, b0, s0, col)
    cols.push(col)
  }

  const ata: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0))
  const atb = new Array<number>(d).fill(0)
  for (let i = 0; i < d; i++) {
    const ci = cols[i]
    let b = 0
    for (let t = 0; t < n; t++) b -= ci[t] * e0[t]
    atb[i] = b
    for (let j = i; j < d; j++) {
      const cj = cols[j]
      let s = 0
      for (let t = 0; t < n; t++) s += ci[t] * cj[t]
      ata[i][j] = s
      ata[j][i] = s
    }
  }
  let trace = 0
  for (let i = 0; i < d; i++) trace += ata[i][i]
  const ridge = (trace / d) * 1e-12 + 1e-12
  for (let i = 0; i < d; i++) ata[i][i] += ridge
  return solveLinear(ata, atb)
}

function sseFor(y: Float64Array, n: number, m: number, p: Smoothing, lay: Layout): number {
  const x = solveInitialState(y, n, m, p, lay)
  if (!x) return Number.MAX_VALUE
  const { l0, b0, s0 } = lay.expand(x)
  const e = new Float64Array(n)
  simulate(y, n, m, p, l0, b0, s0, e)
  let sse = 0
  for (let t = 0; t < n; t++) sse += e[t] * e[t]
  return sse
}

function fitEts(series: readonly number[], h: number, m: number): ModelFit {
  const n = series.length
  const y = Float64Array.from(series)
  const lay = layout(m)
  const seasonal = m > 0
  const unpack = (x: number[]): Smoothing => ({ alpha: x[0], beta: x[1], gamma: seasonal ? x[2] : 0 })

  const starts = seasonal
    ? [[0.3, 0.05, 0.1], [0.1, 0.01, 0.3], [0.6, 0.2, 0.05]]
    : [[0.3, 0.1], [0.1, 0.01], [0.7, 0.3]]
  const lower = new Array<number>(starts[0].length).fill(0)
  const upper = new Array<number>(starts[0].length).fill(1)

  const best = multiStartNelderMead((x) => sseFor(y, n, m, unpack(x), lay), starts, {
    lower,
    upper,
    maxIterations: seasonal ? 160 : 300,
    tolerance: 1e-9,
  })

  const p = unpack(best.x)
  const x0 = solveInitialState(y, n, m, p, lay)
  if (!x0) throw new Error('Não foi possível estimar os estados iniciais.')
  const { l0, b0, s0 } = lay.expand(x0)
  const e = new Float64Array(n)
  const fitted = new Float64Array(n)
  const end = simulate(y, n, m, p, l0, b0, s0, e, fitted)
  const forecast = Array.from({ length: h }, (_, i) => {
    const k = i + 1
    return end.level + k * end.trend + (end.seasonal ? end.seasonal[(n - 1 + k) % m] : 0)
  })
  return { fit: Array.from(fitted), forecast }
}

/** SPEC-FCS-04 */
export function holt(y: readonly number[], h: number): ModelFit | null {
  return y.length < 2 ? null : fitEts(y, h, 0)
}

/** SPEC-FCS-05: exige ao menos dois ciclos completos (n ≥ 2m), como o statsmodels. */
export function holtWinters(y: readonly number[], h: number, m: number): ModelFit | null {
  if (m < 2 || y.length < 2 * m) return null
  return fitEts(y, h, m)
}
