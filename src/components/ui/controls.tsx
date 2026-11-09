import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

export function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[0.82rem] font-semibold text-ink">
        {label}
      </label>
      {children}
    </div>
  )
}

const controlBase = 'min-h-11 w-full rounded-control border border-border bg-white px-3 text-[0.92rem] text-ink'

export function Select({ label, value, options, onChange, testId, className }: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  testId?: string
  className?: string
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} className={className}>
      <select id={id} className={controlBase} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  )
}

function arrowNav(e: KeyboardEvent<HTMLElement>, count: number, index: number, set: (i: number) => void) {
  const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!dir) return
  e.preventDefault()
  set((index + dir + count) % count)
}

/** Controle segmentado: uma opção sempre selecionada. */
export function Segmented<T extends string>({ label, options, value, onChange, testId }: {
  label?: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  testId?: string
}) {
  const idx = options.indexOf(value)
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      {label && <span className="text-[0.82rem] font-semibold text-ink">{label}</span>}
      <div role="radiogroup" aria-label={label} className="inline-flex w-full overflow-hidden rounded-control border border-border bg-canvas-2 p-0.5" onKeyDown={(e) => arrowNav(e, options.length, idx, (i) => onChange(options[i]))}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value} tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)}
            className={cx('min-h-10 flex-1 rounded-[9px] px-3 text-[0.88rem] font-semibold transition', o === value ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Pílulas com quebra de linha: uma opção sempre selecionada. */
export function Pills<T extends string>({ label, options, value, onChange, format, testId }: {
  label?: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
  testId?: string
}) {
  const idx = options.indexOf(value)
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      {label && <span className="text-[0.82rem] font-semibold text-ink">{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2" onKeyDown={(e) => arrowNav(e, options.length, idx, (i) => onChange(options[i]))}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value} tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)}
            className={cx('min-h-10 rounded-full border px-3.5 text-[0.86rem] font-semibold transition', o === value ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-white text-muted hover:text-ink')}>
            {format ? format(o) : o}
          </button>
        ))}
      </div>
    </div>
  )
}

export interface TabDef<T extends string> {
  id: T
  label: string
  icon?: IconName
}

export function Tabs<T extends string>({ tabs, value, onChange, children }: { tabs: readonly TabDef<T>[]; value: T; onChange: (v: T) => void; children: ReactNode }) {
  const idx = tabs.findIndex((t) => t.id === value)
  const base = useId()
  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-border" onKeyDown={(e) => arrowNav(e, tabs.length, idx, (i) => onChange(tabs[i].id))}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`${base}-${t.id}`} aria-selected={t.id === value} aria-controls={`${base}-panel`} tabIndex={t.id === value ? 0 : -1} onClick={() => onChange(t.id)}
            className={cx('inline-flex min-h-11 flex-none items-center gap-2 rounded-t-[10px] px-4 text-[0.9rem] font-semibold transition', t.id === value ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink')}>
            {t.icon && <Icon name={t.icon} size={16} />}
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${value}`}>
        {children}
      </div>
    </div>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, testId, help }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  testId?: string
  help?: string
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-3" title={help}>
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 flex-1 accent-primary" data-testid={testId} />
        <output className="w-12 text-right text-[0.9rem] font-bold tabular-nums text-ink">{value}</output>
      </div>
    </Field>
  )
}

export function NumberInput({ label, value, min, max, step = 1, onChange, testId }: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  testId?: string
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id}>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} value={value} className={controlBase}
        onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))) }} data-testid={testId} />
    </Field>
  )
}

/** Janela entre dois pontos de uma lista de rótulos (dois controles, um para cada ponta). */
export function RangeSlider({ label, labels, value, onChange, format, testId }: {
  label: string
  labels: readonly string[]
  value: [number, number]
  onChange: (v: [number, number]) => void
  format: (s: string) => string
  testId?: string
}) {
  const [lo, hi] = value
  const max = Math.max(0, labels.length - 1)
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <span className="text-[0.82rem] font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <input aria-label={`${label}: início`} type="range" min={0} max={max} value={lo} onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])} className="h-11 flex-1 accent-primary" data-testid={testId && `${testId}-lo`} />
        <input aria-label={`${label}: fim`} type="range" min={0} max={max} value={hi} onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])} className="h-11 flex-1 accent-primary" data-testid={testId && `${testId}-hi`} />
      </div>
      <div className="flex justify-between text-[0.8rem] font-semibold tabular-nums text-muted">
        <span>{labels.length ? format(labels[lo]) : '—'}</span>
        <span>{labels.length ? format(labels[hi]) : '—'}</span>
      </div>
    </div>
  )
}

export function DateRange({ label, min, max, value, onChange, testId }: {
  label: string
  min: string
  max: string
  value: [string, string]
  onChange: (v: [string, string]) => void
  testId?: string
}) {
  const a = useId()
  const b = useId()
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <span className="text-[0.82rem] font-semibold text-ink">{label}</span>
      <div className="flex gap-2">
        <input id={a} aria-label={`${label}: início`} type="date" min={min} max={max} value={value[0]} className={controlBase} onChange={(e) => e.target.value && onChange([e.target.value, value[1] < e.target.value ? e.target.value : value[1]])} data-testid={testId && `${testId}-ini`} />
        <input id={b} aria-label={`${label}: fim`} type="date" min={min} max={max} value={value[1]} className={controlBase} onChange={(e) => e.target.value && onChange([value[0] > e.target.value ? e.target.value : value[0], e.target.value])} data-testid={testId && `${testId}-fim`} />
      </div>
    </div>
  )
}

export function MultiSelect({ label, options, value, onChange, placeholder, format, testId }: {
  label: string
  options: readonly string[]
  value: readonly string[]
  onChange: (v: string[]) => void
  placeholder: string
  format?: (v: string) => string
  testId?: string
}) {
  const summary = value.length === 0 ? placeholder : value.map((v) => (format ? format(v) : v)).join(', ')
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <span className="text-[0.82rem] font-semibold text-ink">{label}</span>
      <details className="group relative">
        <summary className={cx(controlBase, 'flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden')}>
          <span className={cx('truncate', value.length === 0 && 'text-muted')}>{summary}</span>
          <Icon name="chevron-down" size={16} className="flex-none transition group-open:rotate-180" />
        </summary>
        <div className="absolute z-30 mt-1 max-h-64 w-full min-w-[12rem] overflow-y-auto rounded-control border border-border bg-white p-1 shadow-lg">
          {options.map((o) => {
            const checked = value.includes(o)
            return (
              <label key={o} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[0.9rem] hover:bg-canvas-2">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={() => onChange(checked ? value.filter((v) => v !== o) : options.filter((x) => x === o || value.includes(x)))} />
                {format ? format(o) : o}
              </label>
            )
          })}
        </div>
      </details>
    </div>
  )
}

export function FileDrop({ label, accept, onFile, hint, testId }: { label: string; accept: string; onFile: (f: File) => void; hint?: string; testId?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className={cx('rounded-card border-2 border-dashed p-5 text-center transition', over ? 'border-primary bg-primary-soft' : 'border-border bg-canvas')}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
    >
      <Icon name="upload" size={26} className="mx-auto text-primary" />
      <button type="button" className="mt-2 min-h-11 text-[0.92rem] font-semibold text-primary underline-offset-2 hover:underline" onClick={() => input.current?.click()}>
        {label}
      </button>
      {hint && <p className="mt-1 text-[0.8rem] text-muted">{hint}</p>}
      <input ref={input} type="file" accept={accept} className="sr-only" aria-label={label} data-testid={testId} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

export function Expander({ title, icon, defaultOpen = false, children, testId }: { title: string; icon?: IconName; defaultOpen?: boolean; children: ReactNode; testId?: string }) {
  return (
    <details open={defaultOpen} className="group rounded-card border border-border bg-white shadow-card" data-testid={testId}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-4 py-2.5 text-[0.92rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {icon && <Icon name={icon} size={17} className="text-primary" />}
        <span className="flex-1">{title}</span>
        <Icon name="chevron-down" size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  )
}
