import { useContext } from 'react'
import { DatasetContext, type DatasetState } from './DatasetContext'

export function useDataset(): DatasetState {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error('useDataset deve ser usado dentro de <DatasetProvider>')
  return ctx
}

/** Para telas que só renderizam com base: a guarda de dados garante que existe. */
export function useRecords() {
  const { records, skus } = useDataset()
  if (!records) throw new Error('Base ausente: a guarda de dados deveria ter bloqueado esta tela.')
  return { records, skus }
}
