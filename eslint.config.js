import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'legacy', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Camadas de domínio não dependem da UI (DIP) — ver AGENTS.md
    files: ['src/types/**', 'src/services/**', 'src/lib/**', 'src/store/**', 'src/infra/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/components/**', '**/pages/**'], message: 'Domínio/serviços não podem importar de components/ nem pages/ (mova o tipo para src/types).' },
        ],
      }],
    },
  },
  {
    // services/ e lib/ são puros: nada de React, DOM ou storage (infra/ é a única porta)
    files: ['src/services/**', 'src/lib/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/components/**', '**/pages/**'], message: 'Domínio/serviços não podem importar de components/ nem pages/.' },
          { group: ['react', 'react-dom', 'react-dom/*', '**/store/**', '**/hooks/**', '**/infra/**'], message: 'services/ e lib/ são puros: sem React, store, hooks nem infra.' },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'localStorage', message: 'Só infra/storage.service toca o localStorage.' },
        { name: 'document', message: 'services/ e lib/ não tocam o DOM.' },
        { name: 'window', message: 'services/ e lib/ não tocam o DOM.' },
      ],
    },
  },
  {
    files: ['scripts/**', 'e2e/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
])
