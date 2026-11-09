import type { ModelName } from '../../types'

/** Textos de apoio de cada modelo (docs/mapeamento/README.md §4), literais do original. */
export const MODEL_INFO: Record<ModelName, string> = {
  Naive: 'Repete o último valor observado. Linha de base para comparar os demais.',
  'Média Móvel': 'Média das últimas 3 observações. Suaviza ruído; ideal para demanda estável.',
  SES: 'Suavização exponencial simples: pondera mais os dados recentes.',
  Holt: 'Suavização com tendência — capta crescimento ou queda consistente.',
  'Holt-Winters': 'Tendência + sazonalidade — capta ciclos (ex.: verão, fim de ano).',
  Regressão: 'Reta de tendência ajustada sobre todo o histórico.',
  Croston: 'Específico para demanda intermitente (muitos períodos zerados).',
}
