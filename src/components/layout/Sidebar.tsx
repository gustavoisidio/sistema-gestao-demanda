import { fmtInt, fmtMonthYear } from '../../lib/format'
import { SECTIONS, type RouteDef } from '../../routes'
import { useDataset } from '../../store/useDataset'
import { useToast } from '../../store/useToast'
import { Icon } from '../ui/Icon'
import { cx } from '../ui/cx'

interface Props {
  current: RouteDef
  onNavigate: () => void
}

/** SPEC-SHL-03 / SPEC-SHL-04: cartão de status da base, carregar demonstração e trocar base. */
function StatusCard({ onNavigate }: { onNavigate: () => void }) {
  const { summary, origem, loadDemo, clear } = useDataset()
  const toast = useToast()

  if (summary) {
    return (
      <div className="mt-2 rounded-[14px] border border-white/10 p-3.5" style={{ background: 'linear-gradient(160deg, rgba(99,102,241,.22), rgba(20,184,166,.10))' }} data-testid="side-status">
        <div className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-indigo-300">
          <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-teal-400 shadow-[0_0_0_3px_rgb(45_212_191/0.25)]" />
          Base ativa
        </div>
        <div className="mt-0.5 break-words text-[0.92rem] font-semibold text-slate-50">{origem}</div>
        <dl className="mt-2 space-y-2 text-[0.78rem] text-slate-300">
          <div className="flex justify-between"><dt>SKUs</dt><dd className="font-semibold text-slate-50">{summary.skus}</dd></div>
          <div className="flex justify-between"><dt>Registros</dt><dd className="font-semibold text-slate-50">{fmtInt(summary.registros)}</dd></div>
          <div className="flex justify-between"><dt>Período</dt><dd className="font-semibold text-slate-50">{fmtMonthYear(summary.inicio)} – {fmtMonthYear(summary.fim)}</dd></div>
        </dl>
        <button type="button" data-testid="side-clear" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-white/15 bg-white/5 text-[0.88rem] font-semibold text-slate-100 hover:bg-white/10"
          onClick={() => { clear(); window.location.hash = '/importacao'; onNavigate() }}>
          <Icon name="swap" size={16} /> Trocar base
        </button>
      </div>
    )
  }
  return (
    <div className="mt-2 rounded-[14px] bg-white/[0.04] p-3.5" data-testid="side-status">
      <div className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-indigo-300">
        <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-amber-400 shadow-[0_0_0_3px_rgb(245_158_11/0.25)]" />
        Sem base ativa
      </div>
      <div className="mt-0.5 text-[0.92rem] font-semibold text-slate-50">Carregue dados para começar</div>
      <button type="button" data-testid="side-demo" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-gradient-to-br from-primary to-indigo-500 text-[0.88rem] font-semibold text-white"
        onClick={async () => { await loadDemo(); toast.show('Base de demonstração carregada'); onNavigate() }}>
        <Icon name="bolt" size={16} /> Carregar demonstração
      </button>
    </div>
  )
}

/** SPEC-SHL-02: menu em seções, com o item atual marcado por aria-current. */
export function Sidebar({ current, onNavigate }: Props) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-side p-4 text-side-text">
      <img src="/logo.svg" alt="Demanda+ · Planejamento · S&OP" className="mt-1 h-10 w-auto self-start" />
      <nav aria-label="Principal" className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <div className="mb-1 px-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] opacity-55">{s.title}</div>
            <ul className="space-y-0.5">
              {s.routes.map((r) => (
                <li key={r.id}>
                  <a href={`#${r.path}`} aria-current={r.id === current.id ? 'page' : undefined} onClick={onNavigate}
                    className={cx('flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[0.92rem] font-medium transition', r.id === current.id ? 'text-white' : 'hover:bg-white/5')}
                    style={r.id === current.id ? { background: 'linear-gradient(90deg, rgba(99,102,241,.35), rgba(99,102,241,.08))' } : undefined}>
                    <Icon name={r.icon} size={18} />
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <StatusCard onNavigate={onNavigate} />
      <p className="mt-auto text-[0.7rem] leading-snug text-slate-400">Demanda+ · v2.0 — Previsão estatística, backtesting e colaboração CPFR.</p>
    </div>
  )
}
