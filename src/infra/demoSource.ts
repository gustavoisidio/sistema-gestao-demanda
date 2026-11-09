/** Texto bruto da base de demonstração, carregado sob demanda (fica fora do bundle inicial). */
export async function loadDemoCsv(): Promise<string> {
  const mod = await import('../assets/demo_dataset.csv?raw')
  return mod.default
}
