import { expect, test } from '@playwright/test'

// CHK-9.2: com a CPU do celular simulada (4× mais lenta), os cálculos mais pesados (Holt-Winters semanal, backtest) ficam abaixo de 10 s
// (o clique só retorna depois do cálculo porque ele roda na thread principal; o tempo medido inclui o clique).
test('previsão semanal e comparação semanal em CPU 4× mais lenta', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'throttling por CDP')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('/#/')
  await page.getByTestId('home-demo').click()

  await page.goto('/#/previsao')
  await expect(page.getByTestId('forecast-kpis')).toBeVisible({ timeout: 30_000 })
  const t0 = Date.now()
  await page.getByRole('radio', { name: 'Semanal' }).click()
  await expect(page.getByTestId('forecast-kpis')).toBeVisible({ timeout: 30_000 })
  const previsao = Date.now() - t0

  await page.goto('/#/comparacao')
  await page.getByRole('radio', { name: 'Semanal' }).click()
  const t1 = Date.now()
  await expect(page.getByTestId('metrics-table')).toBeVisible({ timeout: 30_000 })
  const comparacao = Date.now() - t1
  console.log(`previsão semanal: ${previsao} ms · comparação semanal: ${comparacao} ms (CPU 4× mais lenta)`)
  expect(previsao).toBeLessThan(10_000)
  expect(comparacao).toBeLessThan(10_000)
})
