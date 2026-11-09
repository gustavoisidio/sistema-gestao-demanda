import type { IconName } from './components/ui/Icon'

export type RouteId = 'inicio' | 'importacao' | 'analise' | 'previsao' | 'comparacao' | 'cenarios' | 'dashboard' | 'relatorios'

export interface RouteDef {
  id: RouteId
  /** hash sem o `#` */
  path: string
  title: string
  icon: IconName
  /** exige base carregada (SPEC-SHL-05) */
  needsData: boolean
}

export interface RouteSection {
  title: string
  routes: RouteDef[]
}

const r = (id: RouteId, path: string, title: string, icon: IconName, needsData = true): RouteDef => ({ id, path, title, icon, needsData })

/** SPEC-SHL-01/02: seções e itens na ordem do menu original (Cenários antes do Dashboard). */
export const SECTIONS: RouteSection[] = [
  { title: 'Início', routes: [r('inicio', '/', 'Visão geral', 'home', false)] },
  {
    title: 'Dados',
    routes: [r('importacao', '/importacao', 'Importação de dados', 'upload', false), r('analise', '/analise', 'Análise histórica', 'chart-search')],
  },
  {
    title: 'Planejamento',
    routes: [r('previsao', '/previsao', 'Previsão de demanda', 'trending-up'), r('comparacao', '/comparacao', 'Comparação de modelos', 'leaderboard'), r('cenarios', '/cenarios', 'Cenários e CPFR', 'tune')],
  },
  { title: 'Gestão', routes: [r('dashboard', '/dashboard', 'Dashboard gerencial', 'monitor'), r('relatorios', '/relatorios', 'Relatórios e laudos', 'file-text')] },
]

export const ROUTES: RouteDef[] = SECTIONS.flatMap((s) => s.routes)

export const DOCUMENT_TITLE = 'Demanda+ · Gestão de Demanda'

/** Hash desconhecido ou vazio abre a Visão geral. */
export function routeFromHash(hash: string): RouteDef {
  const path = hash.replace(/^#/, '') || '/'
  return ROUTES.find((x) => x.path === path) ?? ROUTES[0]
}
