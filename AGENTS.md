# AGENTS.md — Demanda+

Orientações para o agente que migra e mantém esta aplicação. Leia este arquivo antes de qualquer tarefa.

---

## Processo obrigatório (spec-driven development)

Antes de escrever código de qualquer funcionalidade, siga esta sequência:

1. **Especificação** — o comportamento vira requisitos `SPEC-ÁREA-NN` em `docs/specs/` (ver `docs/specs/README.md`). Os testes citam os IDs e `npm run check:specs` garante a rastreabilidade. O que for adiado vai para `docs/BACKLOG.md`.
2. **Análise de impacto** — liste as camadas afetadas (types, lib, services, store, hooks, components, pages) e os efeitos colaterais.
3. **Planejamento em etapas** — a migração está quebrada em macro-etapas → etapas → sub-etapas em `docs/plans/migracao-react.md`. Cada sub-etapa tem uma checagem verificável (`CHK-…`).
4. **Execução etapa a etapa** — implemente uma sub-etapa, rode a checagem dela, **faça um commit** e só então avance. Cada macro-etapa termina com a checagem da macro-etapa (`npm run verify` + conferência descrita no plano).
5. **Conformidade arquitetural** — respeite a separação de camadas; nada de atalhos.

Se uma etapa falhar, recalcule as próximas antes de continuar. **Dúvida de comportamento, edge case ou UX durante a execução: pause e pergunte** antes de assumir.

---

## Contexto

**Demanda+** é um sistema de previsão e gestão de demanda (S&OP / CPFR): o usuário importa um histórico de vendas (`sku`, `data`, `quantidade_vendida`), analisa o perfil de cada produto, gera previsões com 7 modelos estatísticos, valida por backtesting, simula cenários, monta um plano de consenso com parceiros (CPFR) e exporta laudos.

O sistema nasceu em **Streamlit/Python** (autoria de M4riaclaragomes). Esta base está sendo **migrada por inteiro** para a mesma stack do app de gastos (`~/Downloads/github/web-app-gastos`): React + Vite + TypeScript + Tailwind + Recharts + Vitest. Não há backend: todo o cálculo estatístico roda no navegador, em TypeScript.

Fonte da verdade do comportamento atual: `docs/mapeamento/` (telas, botões, textos, fórmulas). O código Python original fica em `legacy/streamlit/` como referência até a paridade ser validada; não o altere.

---

## Stack

- **React 19** com **Vite 8** e **TypeScript** (estrito)
- **Tailwind CSS 4** (`@tailwindcss/vite`) para estilização
- **Recharts** para gráficos (substitui o Plotly)
- **PapaParse** para CSV e **SheetJS (`xlsx`)** para ler/escrever Excel — carregados sob demanda (`import()`)
- **Vitest + Testing Library** para testes; **Playwright** para o teste de fumaça ponta a ponta
- **ESLint** com regras de camada (`no-restricted-imports`)
- Deploy: **Dockerfile + nginx** (Railway), igual ao app de gastos

---

## Arquitetura

### Separação de responsabilidades

```
src/
├── types/            # Tipos centrais (SaleRecord, Freq, ModelName, métricas…)
├── lib/              # Utilitários genéricos e puros (datas, formatação pt-BR, estatística básica, otimizador)
├── services/         # Regras de negócio puras (sem React, sem I/O de navegador)
│   ├── data/         #   parsing, mapeamento de colunas, validação, tratamento, resumo
│   ├── series/       #   agregação D/W/ME, descarte de períodos parciais, índice futuro
│   ├── eda/          #   indicadores, classificação de perfil, sazonalidade, distribuição
│   ├── forecasting/  #   os 7 modelos, intervalos de confiança, run_all
│   ├── evaluation/   #   métricas de erro, backtest, melhor modelo
│   ├── scenarios/    #   choque linear e promoção
│   ├── cpfr/         #   divergência e status do plano de consenso
│   ├── reports/      #   texto do laudo e recomendações, visão do portfólio
│   └── export/       #   Excel/CSV/TXT (única camada que conhece SheetJS/PapaParse na saída)
├── infra/            # I/O do navegador: storage.service (única camada que toca localStorage), download de arquivos
├── store/            # Estado global da sessão por domínio (DatasetProvider, …); provider e hook em arquivos separados
├── hooks/            # Lógica stateful isolada (useDataset, useSeries, useForecast…)
├── components/
│   ├── ui/           # Átomos reutilizáveis (Button, Card, Badge, Callout, Metric, Tabs, Segmented, Pills, Slider, Modal…)
│   ├── charts/       # Gráficos Recharts específicos (LineForecast, Heatmap, Donut…)
│   └── layout/       # Shell: Sidebar, TopBar/MobileNav, Hero, Section
└── pages/            # Uma por módulo (Inicio, Importacao, AnaliseHistorica, Previsao, Comparacao, Cenarios, Dashboard, Relatorios)
```

### Regras de camada

- `components/` nunca acessa `localStorage` nem faz cálculo de negócio: recebe dados por props ou hooks.
- `services/` contém **apenas funções puras**: sem side effects, sem estado, sem `Date.now()` implícito (a data "agora" entra por parâmetro).
- `hooks/` orquestra serviços e persistência e expõe estado/ações para as páginas.
- `store/` guarda o estado da sessão por domínio. Um novo domínio independente = novo contexto, não mais membros em um contexto existente.
- `types/`, `lib/`, `services/` e `store/` **nunca** importam de `components/` ou `pages/` (imposto por lint).
- `infra/storage.service.ts` é a **única** camada que toca `localStorage`; chaves só em `infra/storageKeys.ts`.
- `pages/` compõem componentes e hooks; não contêm fórmulas.

### Regras que evitam regressões

- **Uma fonte para cada número:** toda série, indicador, métrica e previsão exibida vem de `services/`. Componente não soma, não agrega e não calcula métrica.
- **Mesma regra em todas as telas:** a classificação de perfil sempre usa a série **semanal completa** (como o original); a série por granularidade escolhida vem de `services/series`.
- **Datas sem fuso:** o domínio usa datas de calendário (`YYYY-MM-DD`) e índices de dia UTC (`lib/dates`). Nunca `new Date('YYYY-MM-DD')` direto em regra de negócio.
- **Imutabilidade:** serviços retornam novos arrays/objetos; nunca mutam a entrada.
- **Pt-BR em tudo:** números, datas e textos passam por `lib/format` (`fmtInt`, `fmtNum`, `fmtPct`, `fmtDate`). Os textos de interface seguem `docs/mapeamento/` literalmente, salvo decisão registrada.
- **Spec primeiro:** mudou uma regra? Atualize spec, teste, CHANGELOG (e um ADR, se for decisão de produto) na mesma mudança.
- **Antes de concluir qualquer etapa:** `npm run verify`.

---

## Serviços — funções puras obrigatórias

| Módulo | Funções | Responsabilidade |
|---|---|---|
| `services/data/parse` | `parseCsvText`, `parseSpreadsheet` | Texto/arquivo → linhas brutas com colunas normalizadas (`minúsculas_com_underscore`) |
| `services/data/validate` | `validateData` | Ausentes, nulos, negativos, duplicados (SKU × data), datas inválidas |
| `services/data/clean` | `applyDefaultTreatment` | Descarta sku/data inválidos, nulos e negativos → 0, ordena por sku e data |
| `services/data/summary` | `datasetSummary`, `qualityScore` | Registros, SKUs, início, fim, volume; índice de qualidade |
| `services/series/aggregate` | `seriesFor(records, sku, freq)` | Série `D`/`W`/`ME` com zeros nos buracos e descarte de períodos parciais |
| `services/series/calendar` | `futureIndex`, `resample` | Rótulos de período (semana termina no domingo; mês no último dia) |
| `services/eda` | `calcIndicators`, `classifyBehavior`, `profile`, `portfolioTable` | Perfil de demanda |
| `services/forecasting` | `naive`, `simpleMovingAverage`, `ses`, `holt`, `holtWinters`, `linearRegression`, `croston`, `runAll`, `runModels` | Os 7 modelos + intervalos |
| `services/evaluation` | `calculateMetrics`, `backtest`, `bestModel` | Métricas e teste cego |
| `services/scenarios` | `applyLinear`, `applyPromotion` | Choque e promoções |
| `services/cpfr` | `buildConsensus` | Divergência (%), status e aderência |
| `services/reports` | `recommendations`, `reportText`, `portfolioReport` | Laudo e visão do portfólio |
| `services/export` | `toExcel`, `toCsv`, `templateCsv` | Saídas para download |

> O motor de previsão não pode depender de bibliotecas de estatística externas: Holt, Holt-Winters e SES usam o otimizador próprio de `lib/optimize` (Nelder-Mead com limites). Detalhes e tolerâncias em `docs/specs/forecasting.md`.

---

## Hooks e store

| Peça | Responsabilidade |
|---|---|
| `DatasetProvider` / `useDataset` | Base ativa (registros tratados, origem), carregar demo, trocar base, persistência |
| `useSeries(sku, freq)` | Série memoizada por (base, sku, freq) |
| `useForecast(sku, freq, h)` | Modelos ajustados + recomendação (memoizado) |
| `useBacktest(sku, freq, h)` | Teste cego memoizado |
| `usePersistedState` | `useState` com gravação em `storage.service` e falha explícita |
| `useRoute` | Rota por hash (`#/previsao`) sem biblioteca |

---

## Tipagem

Tipos centrais em `src/types/index.ts`:

```ts
type Freq = 'D' | 'W' | 'ME';
type ModelName = 'Naive' | 'Média Móvel' | 'SES' | 'Holt' | 'Holt-Winters' | 'Regressão' | 'Croston';
type BehaviorClass = 'Estável' | 'Crescente' | 'Decrescente' | 'Irregular' | 'Intermitente' | 'Sazonal/Variável' | 'Sem Dados';

interface SaleRecord { sku: string; data: string /* YYYY-MM-DD */; quantidade_vendida: number }
interface Point { date: string /* YYYY-MM-DD */; value: number }
type Series = Point[];                    // ordenada, sem buracos na granularidade
interface ModelResult { fit: number[] | null; forecast: number[]; sigma: number }
interface Metrics { MAE: number; MSE: number; RMSE: number; 'MAPE (%)': number; 'WAPE (%)': number; 'Viés (Bias)': number; 'Tracking Signal': number }
```

---

## Testabilidade

- Todo código em `services/` e `lib/` tem testes unitários com Vitest, citando os IDs `SPEC-*` no `describe`/`it`.
- Os modelos de previsão têm **dados de referência** gerados pelo código Python original (`src/services/forecasting/__golden__/`), com tolerância documentada. Os modelos determinísticos (Naive, Média Móvel, Regressão, Croston) devem bater com tolerância de 1e-9; os otimizados (SES, Holt, Holt-Winters), dentro da tolerância da spec.
- Componentes `ui/` são testáveis isoladamente e não assumem contexto global.
- Use `data-testid` em controles críticos (upload, seleção de SKU, granularidade, horizonte, modelo, exportações, tabela do CPFR).
- O fluxo ponta a ponta mínimo roda em Playwright (`npm run e2e`): carregar demo → percorrer as 8 telas sem erro de console.

---

## Checagens (micro, macro e final)

| Nível | Quando | O que roda |
|---|---|---|
| **Micro** (`CHK-x.y.z`) | fim de cada sub-etapa | teste/comando específico descrito no plano; commit só se passar |
| **Macro** (`CHK-MACRO-n`) | fim de cada macro-etapa | `npm run verify` + conferência de paridade da área (ver plano) |
| **Final** (`CHK-FINAL`) | antes de mostrar ao usuário | `npm run verify` + `npm run build` + `npm run e2e` + varredura de textos contra `docs/mapeamento/` + conferência visual em 390 px e 1280 px + servidor na rede local |

`npm run verify` = `check:version` + `check:specs` + `tsc -b` + `lint` + `test`.

---

## Convenções de git

- Branch: `<tipo>/<descrição-curta>` (ex.: `feat/migracao-react`).
- **Conventional Commits**, um commit por sub-etapa concluída e verificada: `feat(forecasting): holt com otimizador próprio`, `test(eda): perfis de demanda`, `docs(specs): …`, `chore(scaffold): …`.
- Fork: `origin` = `gustavoisidio/sistema-gestao-demanda`; `upstream` = `M4riaclaragomes/sistema-gestao-demanda`. PR vai de uma branch dedicada do fork para o `main` do upstream; só quem é dono do repositório faz merge.
- Nunca fazer push, abrir PR ou fazer deploy sem pedido explícito.

---

## Boas práticas

- **Erros explícitos:** arquivo malformado, coluna ausente ou histórico insuficiente mostram mensagem clara — nunca falhe em silêncio.
- **Sem lógica em JSX:** condicionais complexas e transformações ficam em hooks/serviços.
- **Nomes descritivos:** `applyDefaultTreatment`, não `clean`.
- **Responsivo de verdade:** o app será testado em celular. Nada de layout só de desktop; alvos de toque ≥ 44 px; sem rolagem horizontal da página.
- **Desempenho:** cálculos pesados (backtest do portfólio) são memoizados e, se passarem de ~100 ms, vão para `requestIdleCallback`/worker (ver BACKLOG).

---

## Preparação para fases futuras

- `storage.service` expõe uma interface que pode ser trocada por uma API (backend de dados) sem mudar os hooks.
- O dataset é um array JSON plano de `SaleRecord` — fácil de exportar/importar e de enviar a um servidor.
- A camada `services/forecasting` não conhece React: pode ser movida para um Web Worker ou para um backend sem reescrita.
