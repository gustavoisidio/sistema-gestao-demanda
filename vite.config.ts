import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// a versão exibida na barra lateral vem do package.json (check:version garante que bate com o CHANGELOG)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    // ignora artefatos AppleDouble (._*) criados em volumes exFAT/SMB e os testes de navegador
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*', 'e2e/**', 'legacy/**'],
  },
} as Parameters<typeof defineConfig>[0])
