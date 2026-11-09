// Estatística básica pura. Convenções do original (pandas/numpy):
// - `std(x, 1)` = desvio amostral (pandas `.std()`); `std(x, 0)` = populacional (`np.std`).
// - Média de vetor vazio é NaN.

export function sum(x: readonly number[]): number {
  let s = 0
  for (const v of x) s += v
  return s
}

export function mean(x: readonly number[]): number {
  return x.length === 0 ? NaN : sum(x) / x.length
}

/** Média ignorando NaN (como `np.nanmean`). */
export function nanMean(x: readonly number[]): number {
  return mean(x.filter((v) => !Number.isNaN(v)))
}

export function variance(x: readonly number[], ddof: 0 | 1): number {
  const n = x.length
  if (n - ddof <= 0) return NaN
  const m = mean(x)
  let s = 0
  for (const v of x) s += (v - m) ** 2
  return s / (n - ddof)
}

export function std(x: readonly number[], ddof: 0 | 1): number {
  return Math.sqrt(variance(x, ddof))
}

/** Desvio ignorando NaN (como `np.nanstd`). */
export function nanStd(x: readonly number[], ddof: 0 | 1): number {
  return std(x.filter((v) => !Number.isNaN(v)), ddof)
}

export function max(x: readonly number[]): number {
  let m = -Infinity
  for (const v of x) if (v > m) m = v
  return x.length === 0 ? NaN : m
}

export function min(x: readonly number[]): number {
  let m = Infinity
  for (const v of x) if (v < m) m = v
  return x.length === 0 ? NaN : m
}

/** Quantil por interpolação linear (método padrão do numpy). `q` em [0, 1]. */
export function quantile(sorted: readonly number[], q: number): number {
  const n = sorted.length
  if (n === 0) return NaN
  const pos = (n - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Reta de mínimos quadrados de `y` sobre `t = 0…n−1`. */
export function olsLine(y: readonly number[]): { intercept: number; slope: number } {
  const n = y.length
  if (n === 0) return { intercept: NaN, slope: NaN }
  if (n === 1) return { intercept: y[0], slope: 0 }
  const tMean = (n - 1) / 2
  const yMean = mean(y)
  let sxy = 0
  let sxx = 0
  for (let t = 0; t < n; t++) {
    sxy += (t - tMean) * (y[t] - yMean)
    sxx += (t - tMean) ** 2
  }
  const slope = sxy / sxx
  return { intercept: yMean - slope * tMean, slope }
}

/** Resolve `A x = b` (A quadrada) por eliminação gaussiana com pivoteamento; devolve null se singular. */
export function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    if (Math.abs(m[pivot][col]) < 1e-12) return null
    if (pivot !== col) [m[pivot], m[col]] = [m[col], m[pivot]]
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col]
      if (f === 0) continue
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = m[i][n]
    for (let c = i + 1; c < n; c++) s -= m[i][c] * x[c]
    x[i] = s / m[i][i]
  }
  return x
}

/** Arredondamento para o inteiro mais próximo com empate para o par (como `np.round`). */
export function roundHalfEven(x: number): number {
  const r = Math.round(x)
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
}
