import type { Freq } from '../../types'

/** SPEC-SER-07: parâmetros por granularidade (docs/mapeamento/README.md §4). */
export const FREQS: readonly Freq[] = ['D', 'W', 'ME']
export const FREQ_LABELS: Record<Freq, string> = { D: 'Diária', W: 'Semanal', ME: 'Mensal' }
export const SEASON: Record<Freq, number> = { D: 7, W: 52, ME: 12 }
export const UNIT: Record<Freq, string> = { D: 'dias', W: 'semanas', ME: 'meses' }
export const UNIT_SING: Record<Freq, string> = { D: 'dia', W: 'semana', ME: 'mês' }
export const DEFAULT_H: Record<Freq, number> = { D: 30, W: 12, ME: 6 }
export const MAX_H: Record<Freq, number> = { D: 180, W: 52, ME: 24 }

export const FREQ_BY_LABEL: Record<string, Freq> = { Diária: 'D', Semanal: 'W', Mensal: 'ME' }
