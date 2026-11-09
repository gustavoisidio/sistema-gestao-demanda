/** Paleta e estilo compartilhado dos gráficos (docs/mapeamento/README.md §2.1). */
export const PALETTE = ['#4F46E5', '#14B8A6', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6', '#EF4444', '#22C55E'] as const
export const COLORS = { primary: '#4F46E5', accent: '#14B8A6', ink: '#0F172A', muted: '#64748B', border: '#E5E7EF', grid: '#EEF1F6', series: '#334155', soft: '#C7D2FE', amber: '#F59E0B', slate: '#94A3B8' } as const

export const AXIS = { stroke: COLORS.muted, fontSize: 12, tickLine: false, axisLine: { stroke: COLORS.border } } as const
export const GRID = { stroke: COLORS.grid, vertical: false } as const

export const TOOLTIP = {
  contentStyle: { background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12.5, color: COLORS.ink },
  labelStyle: { color: COLORS.ink, fontWeight: 600 },
} as const

export const colorOf = (i: number) => PALETTE[i % PALETTE.length]
