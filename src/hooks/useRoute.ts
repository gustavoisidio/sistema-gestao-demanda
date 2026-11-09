import { useCallback, useSyncExternalStore } from 'react'
import { routeFromHash, type RouteDef, type RouteId, ROUTES } from '../routes'

/**
 * O Safari do iOS nem sempre dispara `hashchange` ao voltar (gesto de voltar, cache de páginas): escutamos também
 * `popstate` e `pageshow` e lemos o hash direto da URL a cada notificação.
 */
function subscribe(notify: () => void): () => void {
  window.addEventListener('hashchange', notify)
  window.addEventListener('popstate', notify)
  window.addEventListener('pageshow', notify)
  return () => {
    window.removeEventListener('hashchange', notify)
    window.removeEventListener('popstate', notify)
    window.removeEventListener('pageshow', notify)
  }
}

const getHash = () => window.location.hash

/** SPEC-SHL-01: rota atual pelo hash da URL, com voltar/avançar do navegador. */
export function useRoute(): { route: RouteDef; navigate: (id: RouteId) => void } {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  const navigate = useCallback((id: RouteId) => {
    window.location.hash = ROUTES.find((r) => r.id === id)!.path
  }, [])
  return { route: routeFromHash(hash), navigate }
}
