import type { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'

/** Moldura responsiva: altura menor no celular (docs/mapeamento: 320 px) e a do original a partir de 640 px. */
export function ChartFrame({ height, children, title, testId }: { height: number; children: ReactNode; title?: string; testId?: string }) {
  return (
    <figure className="m-0" data-testid={testId} aria-label={title}>
      {title && <figcaption className="mb-2 text-[0.92rem] font-semibold text-ink">{title}</figcaption>}
      <div className="w-full" style={{ height: `clamp(260px, 62vw, ${height}px)` }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
