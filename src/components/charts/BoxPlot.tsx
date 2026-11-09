import type { BoxStats } from '../../services/eda/distribution'
import { COLORS, colorOf } from './theme'
import { fmtInt } from '../../lib/format'

/** Diagrama de caixa por categoria (T1…T4), em SVG responsivo. */
export function BoxPlot({ boxes, height = 360 }: { boxes: readonly BoxStats[]; height?: number }) {
  const W = 480
  const pad = { l: 52, r: 12, t: 12, b: 28 }
  const all = boxes.flatMap((b) => [b.min, b.max])
  const lo = Math.min(0, ...all)
  const hi = Math.max(1, ...all)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b)
  const slot = (W - pad.l - pad.r) / Math.max(1, boxes.length)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => lo + p * (hi - lo))
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Dispersão por trimestre" data-testid="boxplot">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{fmtInt(t)}</text>
        </g>
      ))}
      {boxes.map((b, i) => {
        const cx = pad.l + slot * i + slot / 2
        const w = Math.min(64, slot * 0.5)
        const c = colorOf(i)
        return (
          <g key={b.quarter} data-testid={`box-${b.quarter}`}>
            <line x1={cx} x2={cx} y1={y(b.whiskerHigh)} y2={y(b.q3)} stroke={c} strokeWidth="1.5" />
            <line x1={cx} x2={cx} y1={y(b.q1)} y2={y(b.whiskerLow)} stroke={c} strokeWidth="1.5" />
            <line x1={cx - w / 4} x2={cx + w / 4} y1={y(b.whiskerHigh)} y2={y(b.whiskerHigh)} stroke={c} strokeWidth="1.5" />
            <line x1={cx - w / 4} x2={cx + w / 4} y1={y(b.whiskerLow)} y2={y(b.whiskerLow)} stroke={c} strokeWidth="1.5" />
            <rect x={cx - w / 2} y={y(b.q3)} width={w} height={Math.max(1, y(b.q1) - y(b.q3))} fill={c} fillOpacity="0.25" stroke={c} strokeWidth="1.5" rx="3">
              <title>{`${b.quarter}: mín ${fmtInt(b.min)} · Q1 ${fmtInt(b.q1)} · mediana ${fmtInt(b.median)} · Q3 ${fmtInt(b.q3)} · máx ${fmtInt(b.max)}`}</title>
            </rect>
            <line x1={cx - w / 2} x2={cx + w / 2} y1={y(b.median)} y2={y(b.median)} stroke={c} strokeWidth="2.5" />
            {b.outliers.map((o, k) => <circle key={k} cx={cx} cy={y(o)} r="3" fill="none" stroke={c} />)}
            <text x={cx} y={height - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill={COLORS.ink}>{b.quarter}</text>
          </g>
        )
      })}
    </svg>
  )
}
