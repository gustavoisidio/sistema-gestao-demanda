import { fmtDateTime, fmtPct } from '../../lib/format'
import { round } from '../../lib/stats'
import type { BehaviorClass, Indicators, ModelName, Series } from '../../types'
import { listSkus } from '../data/summary'
import { bestModel, type BacktestRow } from '../evaluation/backtest'
import { profile } from '../eda/profile'
import { runModels } from '../forecasting'
import { futureIndex } from '../series/calendar'
import { seriesFor } from '../series/aggregate'
import type { SaleRecord } from '../../types'

const CLASS_TEXT: Partial<Record<BehaviorClass, string>> = {
  Crescente: 'O produto apresenta **tendência clara de crescimento**; revise níveis de estoque de segurança e capacidade de reposição.',
  Decrescente: 'O produto apresenta **tendência de queda**; avalie redução de compras e risco de obsolescência.',
  Estável: 'A demanda é **estável**; modelos de média móvel ou suavização simples tendem a performar muito bem.',
  Intermitente: 'Demanda **intermitente** (muitos períodos zerados); o método de Croston e o WAPE são os mais indicados.',
  Irregular: 'Demanda **irregular**, com picos; considere estoque de segurança maior e revisão frequente do plano.',
  'Sazonal/Variável': 'Demanda com **variação moderada/sazonal**; antecipe a cobertura para os períodos de pico.',
}

/** SPEC-REL-01: recomendações do laudo, com `**negrito**` em marcação mínima. */
export function recommendations(classe: BehaviorClass, vies: number, modelo: string, totalReal: number): string[] {
  const out: string[] = []
  if (CLASS_TEXT[classe]) out.push(CLASS_TEXT[classe]!)
  const biasPct = totalReal ? (vies / totalReal) * 100 : 0
  if (biasPct > 5) out.push(`⚠️ O modelo tende a **superestimar** a demanda (${fmtPct(biasPct, 1, true)}) — risco de excesso de estoque.`)
  else if (biasPct < -5) out.push(`⚠️ O modelo tende a **subestimar** a demanda (${fmtPct(biasPct, 1, true)}) — risco de ruptura e venda perdida.`)
  else out.push(`O viés do modelo está **sob controle** (${fmtPct(biasPct, 1, true)} do volume real no teste).`)
  out.push(`🎯 Com base no backtesting, recomenda-se adotar o método **${modelo}** no planejamento.`)
  return out
}

export const stripBold = (s: string) => s.replaceAll('**', '')

/** SPEC-REL-02 */
export function reportText(sku: string, geradoEm: Date, recs: readonly string[]): string {
  return `LAUDO DE DEMANDA — ${sku}\nGerado em ${fmtDateTime(geradoEm)}\n\n` + recs.map((r) => `- ${stripBold(r)}`).join('\n')
}

export interface Report {
  sku: string
  geradoEm: Date
  classe: BehaviorClass
  motivo: string
  indicators: Indicators
  modelo: ModelName | '—'
  melhor: BacktestRow | null
  metricas: BacktestRow[]
  /** 100 − WAPE do melhor modelo */
  acuracia: number
  totalReal: number
  serie: Series
  projecaoDatas: string[]
  projecao: number[]
  recomendacoes: string[]
}

/** SPEC-REL-03: laudo completo de um SKU (série semanal, previsão de 12 semanas). `agora` entra por parâmetro. */
export function buildReport(records: readonly SaleRecord[], sku: string, agora: Date): Report | null {
  const serie = seriesFor(records, sku, 'W')
  const p = profile(records, sku, 'W')
  if (!p.indicators) return null
  const best = bestModel(serie, 'W')
  const melhor = best.tabela[0] ?? null
  const modelo = best.modelo ?? '—'
  const values = serie.map((x) => x.value)
  const proj = (best.modelo && runModels(values, 12, 52)[best.modelo]?.forecast) || new Array<number>(12).fill(0)
  return {
    sku,
    geradoEm: agora,
    classe: p.classe,
    motivo: p.motivo,
    indicators: p.indicators,
    modelo,
    melhor,
    metricas: best.tabela,
    acuracia: 100 - (melhor?.['WAPE (%)'] ?? NaN),
    totalReal: best.totalReal,
    serie,
    projecaoDatas: futureIndex(serie[serie.length - 1].date, 12, 'W'),
    projecao: proj,
    recomendacoes: recommendations(p.classe, melhor?.['Viés (Bias)'] ?? 0, modelo, best.totalReal),
  }
}

/** SPEC-REL-04: pares Indicador/Valor da planilha "Resumo" (valores como texto). */
export function reportSummary(r: Report): { Indicador: string; Valor: string }[] {
  const wape = r.melhor?.['WAPE (%)'] ?? NaN
  return [
    ['SKU', r.sku],
    ['Perfil', r.classe],
    ['Motivo', r.motivo],
    ['Volume total', String(r.indicators.total)],
    ['Média semanal', String(round(r.indicators.media, 2))],
    ['Coef. variação', String(round(r.indicators.cv, 3))],
    ['Crescimento (%)', String(round(r.indicators.crescimento_pct, 2))],
    ['Modelo recomendado', r.modelo],
    ['WAPE (%)', Number.isNaN(wape) ? 'NaN' : String(round(wape, 2))],
  ].map(([Indicador, Valor]) => ({ Indicador, Valor }))
}

export interface PortfolioReportRow {
  sku: string
  perfil: BehaviorClass
  modelo: ModelName | '—'
  acuracia: number | null
  vies: number | null
  volume52: number
  tendencia: number[]
}

/** Uma linha da visão do portfólio (um SKU). */
export function portfolioRow(records: readonly SaleRecord[], sku: string): PortfolioReportRow {
  const serie = seriesFor(records, sku, 'W')
  const best = bestModel(serie, 'W')
  const top = best.tabela[0]
  const last52 = serie.slice(-52).map((p) => p.value)
  const wape = top?.['WAPE (%)']
  return {
    sku,
    perfil: profile(records, sku, 'W').classe,
    modelo: best.modelo ?? '—',
    acuracia: top && wape !== undefined && !Number.isNaN(wape) ? 100 - wape : null,
    vies: top ? top['Viés (Bias)'] : null,
    volume52: last52.reduce((a, b) => a + b, 0),
    tendencia: last52,
  }
}

/** SPEC-REL-05: visão do portfólio; `onProgress(i, total, sku)` antes de cada SKU. */
export function portfolioReport(records: readonly SaleRecord[], onProgress?: (i: number, total: number, sku: string) => void): PortfolioReportRow[] {
  const skus = listSkus(records)
  return skus.map((sku, i) => {
    onProgress?.(i, skus.length, sku)
    return portfolioRow(records, sku)
  })
}
