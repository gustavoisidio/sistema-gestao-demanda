import { useCallback, useEffect, useState } from 'react'
import { routeFromHash, type RouteDef, type RouteId, ROUTES } from '../routes'

/** SPEC-SHL-01: rota atual pelo hash da URL, com voltar/avançar do navegador. */
export function useRoute(): { route: RouteDef; navigate: (id: RouteId) => void } {
  const [route, setRoute] = useState<RouteDef>(() => routeFromHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((id: RouteId) => {
    const target = ROUTES.find((r) => r.id === id)!
    window.location.hash = target.path
  }, [])

  return { route, navigate }
}
