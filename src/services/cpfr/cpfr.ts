import { roundHalfEven, sum } from '../../lib/stats'
import { simpleMovingAverage } from '../forecasting'

/** SPEC-CPF-01: média móvel de janela 4 repetida `h` vezes e arredondada; null com menos de 4 pontos. */
export function cpfrStatistical(weekly: readonly number[], h: number): number[] | null {
  const r = simpleMovingAverage(weekly, h, 4)
  return r ? r.forecast.map(roundHalfEven) : null
}

export type ConsensusStatus = 'Alinhado' | 'Risco de ruptura' | 'Risco de excesso'

export interface ConsensusRow {
  sistema: number
  parceiro: number
  divergenciaPct: number
  status: ConsensusStatus
  critico: boolean
}

export interface Consensus {
  rows: ConsensusRow[]
  criticos: number
  alinhadas: number
  aderenciaPct: number
  totalSistema: number
  totalParceiro: number
  divergenciaTotalPct: number
}

/** Rótulo exibido para cada status (SPEC-CPF-03). */
export const STATUS_LABEL: Record<ConsensusStatus, string> = {
  Alinhado: '✅ Alinhado',
  'Risco de ruptura': '🔺 Risco de ruptura',
  'Risco de excesso': '🔻 Risco de excesso',
}

/** SPEC-CPF-02, 03, 04 */
export function buildConsensus(sistema: readonly number[], parceiro: readonly number[], tolerancia: number): Consensus {
  const rows = sistema.map((s, i): ConsensusRow => {
    const p = parceiro[i]
    const div = s > 0 ? ((p - s) / s) * 100 : 0
    const critico = Math.abs(div) >= tolerancia
    return { sistema: s, parceiro: p, divergenciaPct: div, critico, status: !critico ? 'Alinhado' : div > 0 ? 'Risco de ruptura' : 'Risco de excesso' }
  })
  const criticos = rows.filter((r) => r.critico).length
  const totalSistema = sum(sistema)
  const totalParceiro = sum(parceiro)
  return {
    rows,
    criticos,
    alinhadas: rows.length - criticos,
    aderenciaPct: rows.length ? (1 - criticos / rows.length) * 100 : 0,
    totalSistema,
    totalParceiro,
    divergenciaTotalPct: ((totalParceiro - totalSistema) / Math.max(totalSistema, 1)) * 100,
  }
}

/** SPEC-CPF-05: valor aceito no campo "Plano do parceiro" (inteiro ≥ 0). */
export function sanitizePartnerValue(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}
