import Papa from 'papaparse'
import { stripBom } from '../../lib/text'
import type { LoadResult, RawRow } from '../../types'
import { normalizeColumnName } from './columns'

function buildTable(fields: string[], records: Record<string, unknown>[]): LoadResult {
  const columns = fields.map(normalizeColumnName)
  if (columns.length === 0 || columns.every((c) => c === '')) return { ok: false, message: 'O arquivo não tem cabeçalho.' }
  const rows: RawRow[] = records.map((rec) => {
    const row: RawRow = {}
    fields.forEach((original, i) => {
      const v = rec[original]
      row[columns[i]] = v == null ? '' : String(v)
    })
    return row
  })
  if (rows.length === 0) return { ok: false, message: 'O arquivo não tem linhas de dados.' }
  return { ok: true, table: { columns, rows } }
}

/** SPEC-DAT-02: CSV com detecção de delimitador; erro legível para arquivo vazio. */
export function parseCsvText(text: string): LoadResult {
  const clean = stripBom(text)
  if (clean.trim() === '') return { ok: false, message: 'O arquivo está vazio.' }
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';', '\t', '|'],
  })
  const fields = parsed.meta.fields ?? []
  return buildTable(fields, parsed.data)
}

/** SPEC-DAT-03: primeira aba de .xlsx/.xls; datas viram `YYYY-MM-DD`, sem depender do fuso. */
export async function parseSpreadsheet(data: ArrayBuffer): Promise<LoadResult> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(data, { type: 'array', cellNF: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws || !ws['!ref']) return { ok: false, message: 'A planilha está vazia.' }

  const range = XLSX.utils.decode_range(ws['!ref'])
  const cellText = (r: number, c: number): string => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })]
    if (!cell || cell.v == null) return ''
    if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(String(cell.z))) {
      const d = XLSX.SSF.parse_date_code(cell.v as number)
      return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    }
    if (cell.t === 'd' && cell.v instanceof Date) {
      return `${cell.v.getUTCFullYear()}-${String(cell.v.getUTCMonth() + 1).padStart(2, '0')}-${String(cell.v.getUTCDate()).padStart(2, '0')}`
    }
    return String(cell.v)
  }

  const fields: string[] = []
  for (let c = range.s.c; c <= range.e.c; c++) fields.push(cellText(range.s.r, c))
  const records: Record<string, unknown>[] = []
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const rec: Record<string, unknown> = {}
    let any = false
    fields.forEach((f, i) => {
      const v = cellText(r, range.s.c + i)
      if (v !== '') any = true
      rec[f] = v
    })
    if (any) records.push(rec)
  }
  return buildTable(fields, records)
}

/** Subconjunto de `File` usado aqui (mantém `services/` sem tipos do DOM). */
export interface FileLike {
  name: string
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

/** SPEC-DAT-04: escolhe o leitor pela extensão; nunca lança. */
export async function loadFile(file: FileLike): Promise<LoadResult> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  try {
    if (ext === 'csv') return parseCsvText(await file.text())
    if (ext === 'xlsx' || ext === 'xls') return await parseSpreadsheet(await file.arrayBuffer())
    return { ok: false, message: 'Formato não suportado.' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
