interface Props {
  rows: readonly string[]
  cols: readonly string[]
  values: readonly (readonly (number | null)[])[]
  /** cor da célula a partir de t em 0…1 */
  scale: (t: number) => string
  /** limites da escala; padrão = mínimo e máximo dos valores */
  domain?: [number, number]
  tooltip: (row: string, col: string, value: number) => string
  testId?: string
  rowHeader?: string
}

/** Mapa de calor em grade (linhas × colunas) com rolagem horizontal dentro do cartão. */
export function Heatmap({ rows, cols, values, scale, domain, tooltip, testId, rowHeader }: Props) {
  const flat = values.flat().filter((v): v is number => v !== null)
  const [lo, hi] = domain ?? [Math.min(...flat), Math.max(...flat)]
  const t = (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo))
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `minmax(5.5rem,auto) repeat(${cols.length}, minmax(1.6rem, 1fr))`, minWidth: `${6 + cols.length * 1.9}rem` }}>
        <div className="text-[0.7rem] font-semibold text-muted">{rowHeader}</div>
        {cols.map((c) => (
          <div key={c} className="truncate text-center text-[0.7rem] font-semibold text-muted">{c}</div>
        ))}
        {rows.map((r, ri) => (
          <div key={r} className="contents">
            <div className="truncate pr-2 text-[0.78rem] font-semibold text-ink" title={r}>{r}</div>
            {cols.map((c, ci) => {
              const v = values[ri][ci]
              return v === null ? (
                <div key={c} className="h-8 rounded-[4px] border border-dashed border-border" />
              ) : (
                <div key={c} className="h-8 rounded-[4px]" style={{ background: scale(t(v)) }} title={tooltip(r, c, v)} data-testid="heat-cell" />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[0.72rem] text-muted">
        <span>{Math.round(lo)}</span>
        <div className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((p) => scale(p)).join(',')})` }} />
        <span>{Math.round(hi)}</span>
      </div>
    </div>
  )
}
