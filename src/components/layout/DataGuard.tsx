import type { ReactNode } from 'react'
import { useDataset } from '../../store/useDataset'
import { useToast } from '../../store/useToast'
import { Button, Card } from '../ui/display'

/** SPEC-SHL-05: telas que exigem base só renderizam o conteúdo com base carregada. */
export function DataGuard({ children }: { children: ReactNode }) {
  const { records, loadDemo } = useDataset()
  const toast = useToast()
  if (records) return <>{children}</>
  return (
    <Card testId="no-data">
      <div className="grid items-center gap-4 sm:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="text-[1.05rem] font-bold text-ink">Nenhuma base carregada ainda</h2>
          <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
            Este módulo precisa de um histórico de demanda. Importe sua planilha (CSV/Excel) ou explore o sistema agora com a base de demonstração — 5 produtos com perfis estável, crescente, sazonal, irregular e intermitente.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="primary" icon="bolt" data-testid="guard-demo" onClick={async () => { await loadDemo(); toast.show('Base de demonstração carregada') }}>
            Usar dados de demonstração
          </Button>
          <a href="#/importacao" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control text-[0.9rem] font-semibold text-primary hover:bg-primary-soft">
            Importar minha base
          </a>
        </div>
      </div>
    </Card>
  )
}
