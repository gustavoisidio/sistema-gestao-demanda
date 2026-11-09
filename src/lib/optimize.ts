// Otimizador Nelder–Mead com limites (caixa), determinístico. Usado para ajustar
// os parâmetros de suavização de Holt e Holt-Winters (SPEC-FCS-10).

export interface NelderMeadOptions {
  lower: number[]
  upper: number[]
  /** Tamanho inicial do simplex, em fração da amplitude de cada dimensão. */
  initialStep?: number
  maxIterations?: number
  /** Parada quando a dispersão dos valores do simplex fica abaixo disto (relativo). */
  tolerance?: number
}

export interface NelderMeadResult {
  x: number[]
  fx: number
  iterations: number
}

function clamp(x: number[], lower: number[], upper: number[]): number[] {
  return x.map((v, i) => Math.min(upper[i], Math.max(lower[i], v)))
}

export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  { lower, upper, initialStep = 0.15, maxIterations = 400, tolerance = 1e-10 }: NelderMeadOptions,
): NelderMeadResult {
  const n = x0.length
  const safe = (x: number[]) => {
    const v = f(x)
    return Number.isFinite(v) ? v : Number.MAX_VALUE
  }

  const start = clamp(x0, lower, upper)
  let simplex: { x: number[]; fx: number }[] = [{ x: start, fx: safe(start) }]
  for (let i = 0; i < n; i++) {
    const p = [...start]
    const step = (upper[i] - lower[i]) * initialStep
    p[i] = p[i] + step <= upper[i] ? p[i] + step : p[i] - step
    const c = clamp(p, lower, upper)
    simplex.push({ x: c, fx: safe(c) })
  }

  let iterations = 0
  while (iterations < maxIterations) {
    simplex.sort((a, b) => a.fx - b.fx)
    const best = simplex[0]
    const worst = simplex[n]
    const spread = Math.abs(worst.fx - best.fx)
    if (spread <= tolerance * (Math.abs(best.fx) + tolerance)) break
    iterations++

    const centroid = new Array<number>(n).fill(0)
    for (let i = 0; i < n; i++) for (let d = 0; d < n; d++) centroid[d] += simplex[i].x[d] / n

    const along = (t: number) => clamp(centroid.map((c, d) => c + t * (worst.x[d] - c)), lower, upper)

    const xr = along(-1)
    const fr = safe(xr)
    if (fr < best.fx) {
      const xe = along(-2)
      const fe = safe(xe)
      simplex[n] = fe < fr ? { x: xe, fx: fe } : { x: xr, fx: fr }
    } else if (fr < simplex[n - 1].fx) {
      simplex[n] = { x: xr, fx: fr }
    } else {
      const xc = fr < worst.fx ? along(-0.5) : along(0.5)
      const fc = safe(xc)
      if (fc < Math.min(fr, worst.fx)) {
        simplex[n] = { x: xc, fx: fc }
      } else {
        // encolhe o simplex em direção ao melhor ponto
        simplex = simplex.map((p, i) => {
          if (i === 0) return p
          const x = clamp(p.x.map((v, d) => best.x[d] + 0.5 * (v - best.x[d])), lower, upper)
          return { x, fx: safe(x) }
        })
      }
    }
  }

  simplex.sort((a, b) => a.fx - b.fx)
  return { x: simplex[0].x, fx: simplex[0].fx, iterations }
}

/** Roda o Nelder–Mead a partir de vários pontos iniciais e devolve o melhor resultado. */
export function multiStartNelderMead(
  f: (x: number[]) => number,
  starts: number[][],
  options: NelderMeadOptions,
): NelderMeadResult {
  let best: NelderMeadResult | null = null
  for (const s of starts) {
    const r = nelderMead(f, s, options)
    if (!best || r.fx < best.fx) best = r
  }
  return best!
}
