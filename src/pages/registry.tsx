import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { RouteId } from '../routes'

/** Cada tela é carregada sob demanda (code-splitting por rota). */
export const PAGES: Record<RouteId, LazyExoticComponent<ComponentType>> = {
  inicio: lazy(() => import('./Placeholder')),
  importacao: lazy(() => import('./Placeholder')),
  analise: lazy(() => import('./Placeholder')),
  previsao: lazy(() => import('./Placeholder')),
  comparacao: lazy(() => import('./Placeholder')),
  cenarios: lazy(() => import('./Placeholder')),
  dashboard: lazy(() => import('./Placeholder')),
  relatorios: lazy(() => import('./Placeholder')),
}
