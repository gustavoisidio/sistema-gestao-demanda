// Tipos centrais do domínio (AGENTS.md › Tipagem). Datas de calendário são sempre `YYYY-MM-DD`.

export type Freq = 'D' | 'W' | 'ME'

export const MODEL_NAMES = [
  'Naive',
  'Média Móvel',
  'SES',
  'Holt',
  'Holt-Winters',
  'Regressão',
  'Croston',
] as const

export type ModelName = (typeof MODEL_NAMES)[number]

export type BehaviorClass =
  | 'Estável'
  | 'Crescente'
  | 'Decrescente'
  | 'Irregular'
  | 'Intermitente'
  | 'Sazonal/Variável'
  | 'Sem Dados'

/** Uma linha da base ativa, já tratada. */
export interface SaleRecord {
  sku: string
  data: string
  quantidade_vendida: number
}

/** Um ponto de série temporal; `date` é o rótulo do período. */
export interface Point {
  date: string
  value: number
}

/** Série ordenada e sem buracos na granularidade. */
export type Series = Point[]

/** Saída bruta de um modelo: ajuste (um valor por ponto da série) e previsão. */
export interface ModelFit {
  fit: number[]
  forecast: number[]
}

/** Saída de `runModels`: previsão limitada a >= 0 e desvio dos resíduos. */
export interface ModelResult {
  fit: number[]
  forecast: number[]
  sigma: number
}

export interface Metrics {
  MAE: number
  MSE: number
  RMSE: number
  'MAPE (%)': number
  'WAPE (%)': number
  'Viés (Bias)': number
  'Tracking Signal': number
}

export interface Indicators {
  total: number
  media: number
  maximo: number
  minimo: number
  desvio_padrao: number
  cv: number
  crescimento_pct: number
  periodos_zerados: number
  pct_zerados: number
}

/** Linha crua lida de CSV/planilha: todas as células como texto, colunas com nome normalizado. */
export type RawRow = Record<string, string>

export interface RawTable {
  columns: string[]
  rows: RawRow[]
}

export type RequiredColumn = 'sku' | 'data' | 'quantidade_vendida'

export type LoadResult = { ok: true; table: RawTable } | { ok: false; message: string }

export interface ValidationReport {
  nulos: number
  negativos: number
  duplicadas: number
  datasInvalidas: number
  todasDatasInvalidas: boolean
}

export interface DatasetSummary {
  registros: number
  skus: number
  inicio: string
  fim: string
  volume: number
}
