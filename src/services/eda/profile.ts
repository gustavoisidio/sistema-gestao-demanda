import { listSkus } from '../data/summary'
import { seriesFor, valuesOf } from '../series/aggregate'
import type { Freq, Indicators, SaleRecord } from '../../types'
import { calcIndicators, classifyBehavior, type Behavior } from './indicators'

export interface Profile extends Behavior {
  indicators: Indicators | null
}

/** SPEC-EDA-04: perfil sobre a série da granularidade pedida (as telas sempre usam 'W'). */
export function profile(records: readonly SaleRecord[], sku: string, freq: Freq = 'W'): Profile {
  const indicators = calcIndicators(valuesOf(seriesFor(records, sku, freq)))
  return { indicators, ...classifyBehavior(indicators) }
}

export interface PortfolioRow {
  sku: string
  perfil: Behavior['classe']
  volumeTotal: number
  mediaSemanal: number
  cv: number
  crescimentoPct: number
  tendencia: number[]
}

/** SPEC-EDA-05: uma linha por SKU em ordem alfabética (base semanal). */
export function portfolioTable(records: readonly SaleRecord[]): PortfolioRow[] {
  return listSkus(records).map((sku) => {
    const weekly = valuesOf(seriesFor(records, sku, 'W'))
    const ind = calcIndicators(weekly)
    return {
      sku,
      perfil: classifyBehavior(ind).classe,
      volumeTotal: ind?.total ?? 0,
      mediaSemanal: ind?.media ?? 0,
      cv: ind?.cv ?? 0,
      crescimentoPct: ind?.crescimento_pct ?? 0,
      tendencia: weekly.slice(-52).map((v) => Math.round(v)),
    }
  })
}
