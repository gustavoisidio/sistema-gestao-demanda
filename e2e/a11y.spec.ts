import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/importacao', '/analise', '/previsao', '/comparacao', '/cenarios', '/dashboard', '/relatorios']

test('acessibilidade: nenhuma violação crítica ou séria nas telas', async ({ page }) => {
  await page.goto('/#/')
  await page.getByTestId('home-demo').click()
  await expect(page.getByTestId('portfolio-table')).toBeVisible()
  const found: string[] = []
  for (const r of ROUTES) {
    await page.goto(`/#${r}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(2500) // gráficos e cálculos terminam de pintar
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    for (const v of res.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious')) found.push(`${r}: ${v.id} (${v.impact}) × ${v.nodes.length} — ${v.help}`)
  }
  expect(found).toEqual([])
})
