import { Suspense } from 'react'
import { useRoute } from '../hooks/useRoute'
import { PAGES } from '../pages/registry'
import { DatasetProvider } from '../store/DatasetProvider'
import { ToastProvider } from '../store/ToastProvider'
import type { SaleRecord } from '../types'
import { AppShell } from './layout/AppShell'
import { DataGuard } from './layout/DataGuard'
import { SaveWarning } from './layout/SaveWarning'
import { Spinner } from './ui/display'

function Routes() {
  const { route } = useRoute()
  const Page = PAGES[route.id]
  const content = (
    <Suspense fallback={<Spinner label="Carregando…" />}>
      <Page />
    </Suspense>
  )
  return (
    <AppShell route={route}>
      <SaveWarning />
      {route.needsData ? <DataGuard>{content}</DataGuard> : content}
    </AppShell>
  )
}

export default function App({ initial }: { initial?: { records: SaleRecord[]; origem: string } | null }) {
  return (
    <DatasetProvider initial={initial}>
      <ToastProvider>
        <Routes />
      </ToastProvider>
    </DatasetProvider>
  )
}
