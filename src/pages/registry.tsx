import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { RouteId } from '../routes'

/** Cada tela é carregada sob demanda (code-splitting por rota). */
export const PAGES: Record<RouteId, LazyExoticComponent<ComponentType>> = {
  inicio: lazy(() => import('./Inicio')),
  importacao: lazy(() => import('./Importacao')),
  analise: lazy(() => import('./AnaliseHistorica')),
  previsao: lazy(() => import('./Previsao')),
  comparacao: lazy(() => import('./Placeholder')),
  cenarios: lazy(() => import('./Placeholder')),
  dashboard: lazy(() => import('./Placeholder')),
  relatorios: lazy(() => import('./Placeholder')),
}
