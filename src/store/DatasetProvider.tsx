import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { clearDataset, loadDataset, saveDataset } from '../infra/datasetStorage'
import { loadDemoCsv } from '../infra/demoSource'
import { buildDemoRecords } from '../services/data/demo'
import { datasetSummary, listSkus } from '../services/data/summary'
import { DEMO_ORIGIN } from '../services/data/template'
import type { SaleRecord } from '../types'
import { DatasetContext, type DatasetState } from './DatasetContext'

interface Props {
  children: ReactNode
  /** para testes: base inicial sem passar pelo armazenamento */
  initial?: { records: SaleRecord[]; origem: string } | null
}

export function DatasetProvider({ children, initial }: Props) {
  const [data, setData] = useState<{ records: SaleRecord[]; origem: string } | null>(() => {
    if (initial !== undefined) return initial
    const stored = loadDataset()
    return stored ? { records: stored.registros, origem: stored.origem } : null
  })
  const [saveFailed, setSaveFailed] = useState(false)

  const setDataset = useCallback((records: SaleRecord[], origem: string) => {
    setData({ records, origem })
    setSaveFailed(!saveDataset(origem, records))
  }, [])

  const loadDemo = useCallback(async () => {
    setDataset(buildDemoRecords(await loadDemoCsv()), DEMO_ORIGIN)
  }, [setDataset])

  const clear = useCallback(() => {
    setData(null)
    setSaveFailed(false)
    clearDataset()
  }, [])

  const dismissSaveWarning = useCallback(() => setSaveFailed(false), [])

  const value = useMemo<DatasetState>(
    () => ({
      records: data?.records ?? null,
      origem: data?.origem ?? null,
      summary: data ? datasetSummary(data.records) : null,
      skus: data ? listSkus(data.records) : [],
      saveFailed,
      setDataset,
      loadDemo,
      clear,
      dismissSaveWarning,
    }),
    [data, saveFailed, setDataset, loadDemo, clear, dismissSaveWarning],
  )

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}
