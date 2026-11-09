import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SHOTS = process.env.E2E_SHOTS
const ROUTES: { path: string; h1: string; ready: string }[] = [
  { path: '/', h1: 'Planeje a demanda com precisão estatística', ready: '[data-testid="portfolio-table"]' },
  { path: '/importacao', h1: 'Importação de dados', ready: '[data-testid="format-help"]' },
  { path: '/analise', h1: 'Análise histórica', ready: '[data-testid="chart-series"]' },
  { path: '/previsao', h1: 'Previsão de demanda', ready: '[data-testid="chart-forecast"]' },
  { path: '/comparacao', h1: 'Comparação de modelos', ready: '[data-testid="chart-blind"]' },
  { path: '/cenarios', h1: 'Cenários e CPFR', ready: '[data-testid="chart-scenario"]' },
  { path: '/dashboard', h1: 'Dashboard gerencial', ready: '[data-testid="heat-intensity"]' },
  { path: '/relatorios', h1: 'Relatórios e laudos', ready: '[data-testid="rel-hint"]' },
]

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  return errors
}

async function loadDemo(page: Page) {
  await page.goto('/#/')
  await page.getByTestId('home-demo').click()
  await expect(page.getByTestId('portfolio-table')).toBeVisible()
}

test('carrega a demonstração e percorre as 8 telas sem erro e sem rolagem horizontal', async ({ page }, info) => {
  const errors = watchErrors(page)
  await loadDemo(page)
  if (SHOTS) mkdirSync(SHOTS, { recursive: true })

  for (const r of ROUTES) {
    await page.goto(`/#${r.path}`)
    await expect(page.getByRole('heading', { level: 1, name: r.h1 })).toBeVisible()
    await expect(page.locator(r.ready)).toBeVisible({ timeout: 30_000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${r.path}: rolagem horizontal de ${overflow}px`).toBeLessThanOrEqual(1)
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${info.project.name}${r.path === '/' ? '-inicio' : r.path.replace('/', '-')}.png`), fullPage: true })
  }
  expect(errors).toEqual([])
})

test('a base sobrevive ao recarregar a página', async ({ page }) => {
  await loadDemo(page)
  await page.reload()
  await page.goto('/#/analise')
  await expect(page.getByTestId('chart-series')).toBeVisible()
})

test('importa um CSV e confirma a base', async ({ page }, info) => {
  const errors = watchErrors(page)
  await page.goto('/#/importacao')
  const csv = 'sku,data,quantidade_vendida\n' + Array.from({ length: 120 }, (_, i) => `A,${new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10)},${10 + (i % 9)}`).join('\n')
  const file = join(info.outputDir, 'vendas.csv')
  mkdirSync(info.outputDir, { recursive: true })
  writeFileSync(file, csv)
  await page.getByTestId('file-input').setInputFiles(file)
  await expect(page.getByText('Origem: Arquivo · vendas.csv')).toBeVisible()
  await page.getByTestId('confirm').click()
  await expect(page).toHaveURL(/#\/analise$/)
  await expect(page.getByTestId('chart-series')).toBeVisible()
  expect(errors).toEqual([])
})

test('o menu funciona: gaveta no celular, barra lateral no desktop', async ({ page }, info) => {
  await loadDemo(page)
  if (info.project.name === 'mobile') {
    await page.getByTestId('menu-button').click()
    await page.getByTestId('drawer').getByRole('link', { name: 'Dashboard gerencial' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard gerencial' })).toBeVisible()
    await expect(page.getByTestId('drawer')).toHaveCount(0)
  } else {
    await page.getByTestId('sidebar-desktop').getByRole('link', { name: 'Dashboard gerencial' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard gerencial' })).toBeVisible()
  }
})

test('sem rolagem horizontal da página em 360, 768 e 1024 px', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'larguras definidas no teste')
  await loadDemo(page)
  for (const width of [360, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 })
    for (const r of ROUTES) {
      await page.goto(`/#${r.path}`)
      await expect(page.locator(r.ready)).toBeVisible({ timeout: 30_000 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${width}px ${r.path}: rolagem horizontal de ${overflow}px`).toBeLessThanOrEqual(1)
    }
  }
})
