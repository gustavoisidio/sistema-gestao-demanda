import type { DatasetSummary, SaleRecord, ValidationReport } from '../../types'

/** SPEC-DAT-10 */
export function datasetSummary(records: readonly SaleRecord[]): DatasetSummary {
  let inicio = ''
  let fim = ''
  let volume = 0
  const skus = new Set<string>()
  for (const r of records) {
    skus.add(r.sku)
    volume += r.quantidade_vendida
    if (inicio === '' || r.data < inicio) inicio = r.data
    if (fim === '' || r.data > fim) fim = r.data
  }
  return { registros: records.length, skus: skus.size, inicio, fim, volume }
}

/** Ocorrências que entram no índice: nulos + negativos + duplicadas. */
export function problemCount(v: ValidationReport): number {
  return v.nulos + v.negativos + v.duplicadas
}

/** SPEC-DAT-11 */
export function qualityScore(problemas: number, linhasBrutas: number): number {
  return Math.max(0, 100 - (problemas / Math.max(linhasBrutas, 1)) * 100 * 10)
}

/** SKUs distintos em ordem alfabética (pontos de código, como `sorted()` do Python). */
export function listSkus(records: readonly SaleRecord[]): string[] {
  return [...new Set(records.map((r) => r.sku))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}
