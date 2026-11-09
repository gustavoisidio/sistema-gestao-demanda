import { useEffect, useState, type ReactNode } from 'react'
import type { RouteDef } from '../../routes'
import { Icon } from '../ui/Icon'
import { Sidebar } from './Sidebar'

/** SPEC-SHL-06: menu fixo a partir de 1024 px; abaixo disso, gaveta aberta por um botão no topo. */
export function AppShell({ route, children }: { route: RouteDef; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-dvh lg:pl-[280px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-white/5 lg:block" aria-label="Menu lateral" data-testid="sidebar-desktop">
        <Sidebar current={route} onNavigate={close} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-canvas/80 px-4 py-2 backdrop-blur lg:hidden">
        <button type="button" aria-label="Abrir menu" aria-expanded={open} data-testid="menu-button" className="grid h-11 w-11 place-items-center rounded-control border border-border bg-white" onClick={() => setOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
        <img src="/icon.svg" alt="" className="h-7 w-7" />
        <span className="text-[0.95rem] font-bold text-ink">{route.title}</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="drawer">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/50" onClick={close} data-testid="drawer-backdrop" />
          <aside className="absolute inset-y-0 left-0 w-[min(300px,85vw)] shadow-2xl" aria-label="Menu lateral">
            <button type="button" aria-label="Fechar" className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-control text-white" onClick={close}>
              <Icon name="close" size={20} />
            </button>
            <Sidebar current={route} onNavigate={close} />
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-[1360px] px-4 pb-16 pt-5 sm:px-6 lg:pt-14">{children}</main>
    </div>
  )
}
