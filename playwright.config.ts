import { defineConfig, devices } from '@playwright/test'

// PLAYWRIGHT_CHROMIUM_PATH permite usar um Chromium já instalado quando a versão baixada não bate com o Playwright
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  webServer: { command: 'npm run build && npx vite preview --port 4173', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    // celular emulado no Chromium (viewport, toque e user agent do iPhone 13); WebKit real fica para a conferência manual
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', launchOptions } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, launchOptions } },
  ],
})
