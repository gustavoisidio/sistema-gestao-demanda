import type { BehaviorClass } from '../../types'

/** Tons dos badges e callouts (docs/mapeamento/README.md §2.1). */
export type Tone = 'indigo' | 'teal' | 'green' | 'amber' | 'red' | 'slate' | 'pink'

export const TONES: Record<Tone, { bg: string; fg: string }> = {
  indigo: { bg: '#EEF2FF', fg: '#4338CA' },
  teal: { bg: '#E6FAF7', fg: '#0F766E' },
  green: { bg: '#ECFDF3', fg: '#15803D' },
  amber: { bg: '#FFF7E6', fg: '#B45309' },
  red: { bg: '#FEF2F2', fg: '#B91C1C' },
  slate: { bg: '#F1F5F9', fg: '#334155' },
  pink: { bg: '#FDF2F8', fg: '#BE185D' },
}

export const PROFILE_TONE: Record<BehaviorClass, Tone> = {
  Estável: 'green',
  Crescente: 'indigo',
  Decrescente: 'red',
  Irregular: 'amber',
  Intermitente: 'pink',
  'Sazonal/Variável': 'teal',
  'Sem Dados': 'slate',
}
