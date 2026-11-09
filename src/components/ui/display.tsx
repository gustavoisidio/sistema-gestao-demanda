import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'
import { TONES, type Tone } from './tones'

export function Badge({ tone = 'indigo', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t = TONES[tone]
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.76rem] font-semibold', className)} style={{ background: t.bg, color: t.fg }}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Callout({ tone = 'indigo', icon, children, testId }: { tone?: Tone; icon?: string; children: ReactNode; testId?: string }) {
  const t = TONES[tone]
  return (
    <div className="my-1 flex items-start gap-3 rounded-[14px] border p-3.5 text-[0.92rem] leading-relaxed" style={{ background: t.bg, color: t.fg, borderColor: `${t.fg}22` }} data-testid={testId}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

export function Card({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cx('rounded-card border border-border bg-white p-4 shadow-card sm:p-5', className)} data-testid={testId}>
      {children}
    </div>
  )
}

export function Metric({ label, value, delta, deltaTone = 'neutral', help, children, testId }: {
  label: string
  value: ReactNode
  delta?: ReactNode
  deltaTone?: 'neutral' | 'good' | 'bad'
  help?: string
  children?: ReactNode
  testId?: string
}) {
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-white px-4 pb-3.5 pt-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift" title={help} data-testid={testId}>
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.07em] text-muted">{label}</div>
      <div className="mt-1 text-[1.6rem] font-bold leading-tight tracking-tight text-ink">{value}</div>
      {delta != null && (
        <div className={cx('mt-1 text-[0.82rem] font-semibold', deltaTone === 'good' && 'text-green-700', deltaTone === 'bad' && 'text-red-700', deltaTone === 'neutral' && 'text-muted')}>{delta}</div>
      )}
      {children}
    </div>
  )
}

export function Hero({ title, subtitle, eyebrow, chips }: { title: string; subtitle: string; eyebrow: string; chips?: string[] }) {
  return (
    <section
      className="relative mb-5 overflow-hidden rounded-[22px] px-5 py-6 text-white shadow-[0_20px_40px_-24px_rgb(49_46_129/0.7)] sm:px-8 sm:py-7"
      style={{
        background:
          'radial-gradient(900px 260px at 100% -20%, rgba(45,212,191,.45), transparent 60%), radial-gradient(600px 240px at -10% 120%, rgba(236,72,153,.28), transparent 60%), linear-gradient(135deg, #1E1B4B 0%, #312E81 48%, #4338CA 100%)',
      }}
    >
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-indigo-200">
          <span className="h-[7px] w-[7px] rounded-full bg-teal-400 shadow-[0_0_0_4px_rgb(45_212_191/0.25)]" aria-hidden="true" />
          {eyebrow}
        </div>
        <h1 className="mb-2 mt-2 text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]">{title}</h1>
        <p className="max-w-[780px] text-[0.95rem] leading-relaxed text-white/80">{subtitle}</p>
        {chips && chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.76rem] font-semibold">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 mt-7">
      <h2 className="flex items-center gap-2.5 text-[1.08rem] font-bold tracking-tight text-ink">
        <span className="h-[18px] w-1 rounded bg-gradient-to-b from-primary to-accent" aria-hidden="true" />
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 pl-3.5 text-[0.86rem] text-muted">{subtitle}</p>}
    </div>
  )
}

export function Step({ n, title, desc }: { n: number | string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] bg-primary-soft text-[0.9rem] font-extrabold text-primary">{n}</div>
      <div>
        <div className="text-[0.98rem] font-bold text-ink">{title}</div>
        <div className="mt-0.5 text-[0.85rem] leading-snug text-muted">{desc}</div>
      </div>
    </div>
  )
}

export function WinnerCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-[18px] px-5 py-5 text-white shadow-[0_16px_32px_-20px_rgb(15_118_110/0.8)]" style={{ background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' }} data-testid="winner-card">
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="my-1 text-[1.7rem] font-extrabold tracking-tight">{value}</div>
      <div className="text-[0.88rem] opacity-90">{meta}</div>
    </div>
  )
}

export function Button({ variant = 'secondary', icon, children, className, ...rest }: {
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: IconName
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-[0.9rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-gradient-to-br from-primary to-indigo-500 text-white shadow-[0_6px_16px_-6px_rgb(79_70_229/0.6)] hover:brightness-105',
        variant === 'secondary' && 'border border-border bg-white text-ink hover:bg-canvas-2',
        variant === 'ghost' && 'text-primary hover:bg-primary-soft',
        className,
      )}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  )
}

export function ProgressBar({ value, max = 100, label, testId }: { value: number; max?: number; label?: string; testId?: string }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100))
  return (
    <div className="w-full" data-testid={testId}>
      {label && <div className="mb-1 text-[0.85rem] text-muted">{label}</div>}
      <div className="h-2 w-full overflow-hidden rounded-full bg-grid" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-4 text-[0.9rem] text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
      {label}
    </div>
  )
}
