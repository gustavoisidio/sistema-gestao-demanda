import Papa from 'papaparse'
import { isValidISO, toDayIndex } from '../../lib/dates'

export type Cell = string | number | boolean | null | undefined
export type ExportRow = Record<string, Cell>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function columnsOf(rows: readonly ExportRow[]): string[] {
  const cols: string[] = []
  for (const row of rows) for (const k of Object.keys(row)) if (!cols.includes(k)) cols.push(k)
  return cols
}

const isEmpty = (v: Cell) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))

/** SPEC-EXP-01: um .xlsx com uma aba por chave (nome truncado em 31), datas ISO gravadas como datas. */
export async function toExcel(sheets: Record<string, readonly ExportRow[]>): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    const cols = columnsOf(rows)
    const ws: import('xlsx').WorkSheet = {}
    cols.forEach((c, ci) => {
      ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = { t: 's', v: c }
    })
    rows.forEach((row, ri) => {
      cols.forEach((c, ci) => {
        const v = row[c]
        if (isEmpty(v)) return
        const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci })
        if (typeof v === 'number') ws[addr] = { t: 'n', v }
        else if (typeof v === 'boolean') ws[addr] = { t: 'b', v }
        else if (ISO_DATE.test(v!) && isValidISO(v!)) ws[addr] = { t: 'n', v: toDayIndex(v!) + 25569, z: 'yyyy-mm-dd' }
        else ws[addr] = { t: 's', v: v as string }
      })
    })
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 0), c: Math.max(cols.length - 1, 0) } })
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

/** SPEC-EXP-02 */
export function toCsv(rows: readonly ExportRow[]): string {
  const cols = columnsOf(rows)
  return Papa.unparse(
    { fields: cols, data: rows.map((r) => cols.map((c) => (isEmpty(r[c]) ? '' : r[c]))) },
    { newline: '\n' },
  )
}

/** SPEC-EXP-03: troca caracteres inválidos em nomes de arquivo por `_`. */
export function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_')
}

export const fileNames = {
  forecastXlsx: (sku: string, freqLabel: string) => safeFileName(`previsao_${sku}_${freqLabel.toLowerCase()}.xlsx`),
  forecastCsv: (sku: string) => safeFileName(`previsao_${sku}.csv`),
  scenario: (sku: string) => safeFileName(`cenario_${sku}.xlsx`),
  cpfr: (sku: string) => safeFileName(`cpfr_${sku}.xlsx`),
  reportXlsx: (sku: string) => safeFileName(`laudo_${sku}.xlsx`),
  historyCsv: (sku: string) => safeFileName(`historico_${sku}.csv`),
  reportTxt: (sku: string) => safeFileName(`laudo_${sku}.txt`),
  portfolio: 'portfolio.xlsx',
  template: 'modelo_importacao.csv',
} as const

/** SPEC-EXP-04: nomes das abas. */
export const SHEETS = {
  forecast: 'Previsao',
  scenario: 'Cenario',
  cpfr: 'CPFR',
  report: { summary: 'Resumo', metrics: 'Metricas', forecast: 'Previsao', history: 'Historico' },
  portfolio: 'Portfolio',
} as const
