import { stripBom } from '../../lib/text'
import type { RawRow, RawTable, RequiredColumn } from '../../types'

export const REQUIRED_COLUMNS: readonly RequiredColumn[] = ['sku', 'data', 'quantidade_vendida']

/** Rótulos dos seletores de mapeamento (docs/mapeamento/01-importacao.md §4). */
export const REQUIRED_LABELS: Record<RequiredColumn, string> = {
  sku: 'Produto / SKU',
  data: 'Data',
  quantidade_vendida: 'Quantidade vendida',
}

/** SPEC-DAT-01: minúsculas e espaços viram `_`; BOM descartado. */
export function normalizeColumnName(name: string): string {
  return stripBom(name).toLowerCase().replaceAll(' ', '_')
}

/** SPEC-DAT-05: colunas obrigatórias ausentes, na ordem do esquema. */
export function missingRequired(columns: readonly string[]): RequiredColumn[] {
  return REQUIRED_COLUMNS.filter((c) => !columns.includes(c))
}

/** SPEC-DAT-05: colunas do arquivo que não têm nome padrão. */
export function mappingOptions(columns: readonly string[]): string[] {
  return columns.filter((c) => !(REQUIRED_COLUMNS as readonly string[]).includes(c))
}

export type ColumnMapping = Partial<Record<RequiredColumn, string>>

/** Mapeamento completo: todo campo faltante tem uma coluna e nenhuma coluna serve a dois campos. */
export function isMappingComplete(missing: readonly RequiredColumn[], mapping: ColumnMapping): boolean {
  const chosen = missing.map((m) => mapping[m])
  if (chosen.some((c) => !c)) return false
  return new Set(chosen).size === chosen.length
}

/** SPEC-DAT-05: renomeia a coluna escolhida para o nome padrão, sem alterar os valores. */
export function applyMapping(table: RawTable, mapping: ColumnMapping): RawTable {
  const rename = new Map<string, string>()
  for (const [target, source] of Object.entries(mapping)) if (source) rename.set(source, target)
  const rn = (c: string) => rename.get(c) ?? c
  return {
    columns: table.columns.map(rn),
    rows: table.rows.map((row): RawRow => Object.fromEntries(Object.entries(row).map(([k, v]) => [rn(k), v]))),
  }
}
