import { useMemo, useState, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

export interface Column<R> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  /** valor usado para ordenar e buscar */
  value: (row: R) => string | number | boolean | null
  /** conteúdo da célula (padrão: o próprio valor) */
  render?: (row: R) => ReactNode
  sortable?: boolean
  width?: string
}

interface Props<R> {
  columns: readonly Column<R>[]
  rows: readonly R[]
  rowKey: (row: R, index: number) => string
  searchable?: boolean
  maxHeight?: number
  /** mostra só as primeiras N linhas, com botão "Mostrar mais" */
  pageSize?: number
  testId?: string
  emptyText?: string
}

export function DataTable<R>({ columns, rows, rowKey, searchable = false, maxHeight, pageSize, testId, emptyText = 'Nenhum registro.' }: Props<R>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(pageSize ?? Infinity)

  const shown = useMemo(() => {
    let out = rows.map((r, i) => ({ r, i }))
    const q = query.trim().toLowerCase()
    if (q) out = out.filter(({ r }) => columns.some((c) => String(c.value(r) ?? '').toLowerCase().includes(q)))
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)!
      out = [...out].sort((a, b) => {
        const x = col.value(a.r)
        const y = col.value(b.r)
        if (x === y) return a.i - b.i
        if (x === null) return 1
        if (y === null) return -1
        return (x < y ? -1 : 1) * sort.dir
      })
    }
    return out
  }, [rows, columns, sort, query])

  const toggle = (key: string) => setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null))

  return (
    <div data-testid={testId}>
      {searchable && (
        <label className="mb-2 flex min-h-11 items-center gap-2 rounded-control border border-border bg-white px-3">
          <Icon name="search" size={16} className="text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" aria-label="Buscar na tabela" className="w-full bg-transparent text-[0.9rem] outline-none" />
        </label>
      )}
      <div className="overflow-auto rounded-xl border border-border bg-white" style={maxHeight ? { maxHeight } : undefined} role="region" aria-label="Tabela (use as setas para rolar)" tabIndex={0}>
        <table className="w-full border-collapse text-[0.88rem]">
          <thead className="sticky top-0 z-10 bg-canvas-2">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} scope="col" style={c.width ? { width: c.width } : undefined} aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : undefined}
                    className={cx('whitespace-nowrap px-3 py-2.5 text-[0.76rem] font-bold uppercase tracking-wide text-muted', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                    {c.sortable === false ? (
                      c.header
                    ) : (
                      <button type="button" className="inline-flex min-h-8 items-center gap-1 uppercase" onClick={() => toggle(c.key)}>
                        {c.header}
                        <span aria-hidden="true" className={active ? 'text-primary' : 'opacity-30'}>{active ? (sort!.dir === 1 ? '▲' : '▼') : '↕'}</span>
                      </button>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted">{emptyText}</td></tr>
            )}
            {shown.slice(0, visible).map(({ r, i }) => (
              <tr key={rowKey(r, i)} className="border-t border-grid">
                {columns.map((c) => (
                  <td key={c.key} className={cx('px-3 py-2 tabular-nums', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                    {c.render ? c.render(r) : String(c.value(r) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize !== undefined && shown.length > visible && (
        <button type="button" className="mt-2 min-h-11 w-full rounded-control border border-border bg-white text-[0.88rem] font-semibold text-primary" onClick={() => setVisible((v) => v + pageSize)}>
          Mostrar mais ({Math.min(pageSize, shown.length - visible)} de {shown.length - visible} restantes)
        </button>
      )}
    </div>
  )
}

/** Barra de progresso dentro de célula. */
export function BarCell({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-grid"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
      <span className="w-14 text-right text-[0.82rem]">{label}</span>
    </div>
  )
}

/** Mini gráfico de linha/área para células. */
export function Sparkline({ values, area = false, width = 110, height = 28 }: { values: readonly number[]; area?: boolean; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-muted">—</span>
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - lo) / span) * (height - 4)}`)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="tendência" data-testid="sparkline">
      {area && <polygon points={`0,${height} ${pts.join(' ')} ${width},${height}`} fill="#4F46E5" fillOpacity="0.15" />}
      <polyline points={pts.join(' ')} fill="none" stroke="#4F46E5" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
