import { max, mean, min, std, sum } from '../../lib/stats'
import type { BehaviorClass, Indicators } from '../../types'

/** SPEC-EDA-01: crescimento entre a 1ª e a 2ª metade da série (%), 0 se a 1ª metade não é positiva. */
export function growthPct(values: readonly number[]): number {
  const meio = Math.floor(values.length / 2)
  const m1 = mean(values.slice(0, meio))
  const m2 = mean(values.slice(meio))
  return m1 > 0 ? ((m2 - m1) / m1) * 100 : 0
}

/** SPEC-EDA-01 / SPEC-EDA-02 */
export function calcIndicators(values: readonly number[]): Indicators | null {
  if (values.length === 0) return null
  const media = mean(values)
  const desvio = std(values, 1)
  const zeros = values.filter((v) => v === 0).length
  return {
    total: sum(values),
    media,
    maximo: max(values),
    minimo: min(values),
    desvio_padrao: desvio,
    cv: media > 0 ? desvio / media : 0,
    crescimento_pct: growthPct(values),
    periodos_zerados: zeros,
    pct_zerados: zeros / values.length,
  }
}

export interface Behavior {
  classe: BehaviorClass
  motivo: string
}

/** SPEC-EDA-03: primeira regra verdadeira; comparações com NaN são falsas. */
export function classifyBehavior(ind: Indicators | null): Behavior {
  if (!ind) return { classe: 'Sem Dados', motivo: '' }
  if (ind.pct_zerados > 0.3) return { classe: 'Intermitente', motivo: 'Muitos períodos sem demanda.' }
  if (ind.cv < 0.2 && Math.abs(ind.crescimento_pct) < 10) return { classe: 'Estável', motivo: 'Baixa variabilidade.' }
  if (ind.crescimento_pct > 20) return { classe: 'Crescente', motivo: 'Tendência de alta.' }
  if (ind.crescimento_pct < -20) return { classe: 'Decrescente', motivo: 'Tendência de queda.' }
  if (ind.cv >= 0.5) return { classe: 'Irregular', motivo: 'Alta variabilidade (picos).' }
  return { classe: 'Sazonal/Variável', motivo: 'Variação moderada.' }
}
