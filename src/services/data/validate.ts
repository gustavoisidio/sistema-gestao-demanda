import type { RawRow, ValidationReport } from '../../types'
import { parseDate, parseQuantity } from './values'

/** SPEC-DAT-08: auditoria da base antes do tratamento. */
export function validateData(rows: readonly RawRow[]): ValidationReport {
  let nulos = 0
  let negativos = 0
  let duplicadas = 0
  let datasInvalidas = 0
  let validas = 0
  const seen = new Set<string>()

  for (const row of rows) {
    const q = parseQuantity(row.quantidade_vendida)
    if (q === null) nulos++
    else if (q < 0) negativos++

    const date = parseDate(row.data)
    if (date === null) {
      datasInvalidas++
      continue
    }
    validas++
    const sku = (row.sku ?? '').trim()
    if (sku === '') continue
    const key = `${sku}\u0000${date}`
    if (seen.has(key)) duplicadas++
    else seen.add(key)
  }

  return { nulos, negativos, duplicadas, datasInvalidas, todasDatasInvalidas: rows.length > 0 && validas === 0 }
}
