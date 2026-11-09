import { useDataset } from '../../store/useDataset'
import { Callout } from '../ui/display'

/** SPEC-PER-04: a base segue em memória, mas não foi possível gravá-la no aparelho. */
export function SaveWarning() {
  const { saveFailed, dismissSaveWarning } = useDataset()
  if (!saveFailed) return null
  return (
    <div className="mb-4" data-testid="save-warning">
      <Callout tone="amber" icon="⚠️">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Não foi possível salvar a base neste aparelho. Ela continua disponível até você fechar ou recarregar a página.</span>
          <button type="button" className="min-h-11 rounded-control px-3 text-[0.85rem] font-semibold underline" onClick={dismissSaveWarning}>Entendi</button>
        </div>
      </Callout>
    </div>
  )
}
