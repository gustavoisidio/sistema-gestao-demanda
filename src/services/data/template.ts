/** SPEC-DAT-12 */
export function templateCsv(): string {
  return 'sku,data,quantidade_vendida\nPROD_A,2025-01-01,120\nPROD_A,2025-01-02,98\nPROD_B,2025-01-01,40\n'
}

export const DEMO_ORIGIN = 'Base de demonstração'

/** SPEC-DAT-14 */
export function fileOrigin(name: string): string {
  return `Arquivo · ${name}`
}
