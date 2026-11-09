import { addDays, isValidISO } from '../../lib/dates'

/** SPEC-DAT-06: aceita `1234.5`, `1234,5`, `1.234,5`, `R$ 12`; vazio ou inválido → null. */
export function parseQuantity(raw: string | null | undefined): number | null {
  if (raw == null) return null
  let s = String(raw).replace(/R\$/gi, '').replace(/\s/g, '')
  if (s === '') return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    s = lastComma > lastDot ? s.replaceAll('.', '').replace(',', '.') : s.replaceAll(',', '')
  } else if (lastComma >= 0) {
    if (s.indexOf(',') !== lastComma) return null
    s = s.replace(',', '.')
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function iso(y: number, m: number, d: number): string | null {
  const s = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return isValidISO(s) ? s : null
}

/** SPEC-DAT-07: ISO, `YYYY/MM/DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY` e série do Excel. */
export function parseDate(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '') return null

  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(s)
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[T\s].*)?$/.exec(s)
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]))

  // número de série do Excel (sistema 1900): 25569 = 1970-01-01
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s))
    if (serial >= 20000 && serial <= 80000) return addDays('1970-01-01', serial - 25569)
  }
  return null
}
