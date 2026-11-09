# Plano — Migração do Demanda+ (Streamlit → React/Vite/TypeScript)

Specs: [docs/specs](../specs) · Mapeamento: [docs/mapeamento](../mapeamento) · Decisões: [ADR 0001](../adr/0001-migracao-streamlit-para-react.md).
Branch: `feat/migracao-react`. **Um commit por sub-etapa** (Conventional Commits), só depois do `CHK` dela passar.

## Análise de impacto
| Camada | Mudança |
|---|---|
| Repositório | Código Python movido para `legacy/streamlit/` (referência); app novo na raiz (`src/`, `public/`, `scripts/`, `Dockerfile`, `nginx.conf`) |
| types / lib | Novos: tipos de domínio, datas sem fuso, formatação pt-BR, estatística básica, otimizador Nelder–Mead |
| services | Reescrita em TypeScript de `data_processor`, `eda`, `forecasting`, `evaluator`, `scenario_builder` e `services` (+ laudo, dashboard, exportação) |
| infra / store / hooks | Novos: `storage.service`, `DatasetProvider`, `useRoute`, hooks de séries/modelos memoizados |
| components / pages | Novos: biblioteca de UI própria (tokens do Streamlit) e 8 telas; gráficos em Recharts |
| Deploy | Dockerfile + nginx (Railway); **nenhum deploy nesta rodada** |

Efeitos colaterais: o README do repositório deixa de ensinar `streamlit run` (passa a apontar para `npm`); `requirements.txt` e `.streamlit/` vão para `legacy/`. Referência numérica: a saída do Python original (dados de referência) — SPEC-FCS-10.

## Gates (como as checagens funcionam)
- **`CHK-x.y.z` (micro):** comando/teste específico da sub-etapa. Falhou → corrigir antes do commit.
- **`CHK-MACRO-n`:** ao fim da macro-etapa: `npm run verify` verde **e** a conferência de paridade listada. Falhou → não avançar; recalcular as etapas seguintes.
- **`CHK-FINAL`:** ver M10. Só depois dele o app é mostrado ao usuário.
- Em cada sub-etapa que implementa requisitos: remover a linha `**Status:** planejado` dos IDs implementados (só então `check:specs` cobra o teste).

---

## ✅ M0 — Documentação e especificação
| Sub | Entrega | CHK |
|---|---|---|
| 0.1 | `AGENTS.md` | CHK-0.1: contém processo, stack, camadas, checagens e convenções |
| 0.2 | `docs/mapeamento/` (casca + 8 telas) | CHK-0.2: todo arquivo de `views/` e `src/` do original aparece no mapeamento; textos conferidos por busca |
| 0.3 | `docs/specs/` (12 áreas) | CHK-0.3: IDs únicos e formato do modelo de requisito |
| 0.4 | `docs/plans`, `docs/adr`, `docs/BACKLOG.md` | CHK-0.4: links relativos resolvem |
| **CHK-MACRO-0** | Revisão cruzada mapeamento ↔ código original (cada função de `services.py`/`ui.py`/`views/*` tem destino) | |

## ✅ M1 — Fundação do projeto
| Sub | Entrega | CHK |
|---|---|---|
| 1.1 | Mover o código Python para `legacy/streamlit/` | CHK-1.1: `git mv` preserva histórico; nada do Python fora de `legacy/` |
| 1.2 | `package.json`, `tsconfig*`, `vite.config.ts`, `index.html`, `eslint.config.js` | CHK-1.2: `npx tsc -b` e `npm run lint` passam num `main.tsx` mínimo |
| 1.3 | Vitest + Testing Library + `test-setup.ts` | CHK-1.3: um teste de fumaça passa em `npm test` |
| 1.4 | `scripts/check-specs.mjs`, `scripts/check-version.mjs`, `CHANGELOG.md`, `npm run verify` | CHK-1.4: `npm run verify` verde; um ID inexistente num teste faz `check:specs` falhar (teste manual) |
| 1.5 | Tailwind 4 + tokens (`index.css`), fonte Inter | CHK-1.5: `npm run build` gera CSS com os tokens |
| 1.6 | `Dockerfile`, `nginx.conf`, `.dockerignore`, `.gitignore`, template de PR, README novo | CHK-1.6: `docker build` não é exigido; `npm run build` e `npm run preview` servem a página |
| **CHK-MACRO-1** | `npm run verify` + `npm run build` | |

## ✅ M2 — Domínio base (`types`, `lib`)
| Sub | Entrega (specs) | CHK |
|---|---|---|
| 2.1 | `types/index.ts` | CHK-2.1: `tsc -b` |
| 2.2 | `lib/dates.ts` (FMT-05) | CHK-2.2: testes incluem bissexto, virada de ano e `TZ=America/Sao_Paulo` e `TZ=UTC` |
| 2.3 | `lib/format.ts` (FMT-01…04) | CHK-2.3: tabela de exemplos do spec |
| 2.4 | `lib/stats.ts` (média, desvio ddof 0/1, quantis lineares, OLS) | CHK-2.4: comparação com valores calculados em Python (golden) |
| 2.5 | `lib/optimize.ts` (Nelder–Mead com limites) | CHK-2.5: minimiza Rosenbrock/quadráticas com limites; determinístico |
| **CHK-MACRO-2** | `verify` + cobertura de `lib/` ≥ 90% | |

## ✅ M3 — Dados e séries
| Sub | Entrega (specs) | CHK |
|---|---|---|
| 3.1 | Gerador de referência `scripts/golden/` (Python do original) e `__golden__/*.json` | CHK-3.1: arquivos regeneráveis e versionados; script documentado |
| 3.2 | `services/data/parse` (DAT-01…04) | CHK-3.2: CSV (`,` `;`), BOM, CRLF, `.xlsx` gerado em teste |
| 3.3 | `services/data/mapping` (DAT-05) | CHK-3.3: ausentes/opções/rejeição de duplicidade |
| 3.4 | `services/data/validate` + `clean` + `summary` (DAT-06…11) | CHK-3.4: os números da demo = referência do Python (7.280 linhas, 0 nulos/negativos) |
| 3.5 | `templateCsv` + demo (DAT-12…14) | CHK-3.5: demo lida = 5 SKUs, 1.456 linhas por SKU |
| 3.6 | `services/series` (SER-01…07) | CHK-3.6: séries da demo = golden (W: 208 pontos; ME: 46 pontos; D: 1.456) |
| **CHK-MACRO-3** | `verify` + paridade de séries nas 3 granularidades para os 5 SKUs | |

## ✅ M4 — Análise exploratória
| Sub | Entrega | CHK |
|---|---|---|
| 4.1 | indicadores + classificação (EDA-01…04) | CHK-4.1: perfis dos 5 SKUs da demo = golden |
| 4.2 | portfólio e KPIs da janela (EDA-05, 06) | CHK-4.2 |
| 4.3 | média móvel, tendência (EDA-07, 08) | CHK-4.3: = `rolling`/`polyfit` do Python |
| 4.4 | sazonalidade, histograma, boxplot, comparação (EDA-09…13) | CHK-4.4 |
| **CHK-MACRO-4** | `verify` + paridade de indicadores | |

## ✅ M5 — Motor de previsão
| Sub | Entrega | CHK |
|---|---|---|
| 5.1 | Naive, Regressão (FCS-01, 06) | CHK-5.1: golden 1e-9 |
| 5.2 | Média Móvel, Croston (FCS-02, 07) | CHK-5.2: golden 1e-9 (inclui P1) |
| 5.3 | SES (FCS-03) | CHK-5.3: previsão dentro de 0,01% do statsmodels |
| 5.4 | Holt com otimizador (FCS-04, 10) | CHK-5.4: SSE ≤ referência × (1+1e-6); total do horizonte dentro de 5% |
| 5.5 | Holt-Winters (FCS-05, 10) | CHK-5.5: idem; `n < 2m` → indisponível; tempo < 1,5 s |
| 5.6 | `runAll`, `runModels`, intervalos, entradas inválidas (FCS-08, 09, 11, 12, 13) | CHK-5.6 |
| **CHK-MACRO-5** | `verify` + relatório de paridade (tabela modelo × SKU × granularidade) anexado ao commit | |

## ✅ M6 — Avaliação, cenários, relatórios e exportação
| Sub | Entrega | CHK |
|---|---|---|
| 6.1 | métricas e backtest (EVL-01…03) | CHK-6.1: ranking do backtest da demo = golden (ordem dos modelos por WAPE; WAPE do top dentro de 2 p.p.) |
| 6.2 | `bestModel`, ganho, TS (EVL-04…06) | CHK-6.2: modelo recomendado dos 5 SKUs (W e ME) = golden ou explicado em nota |
| 6.3 | cenários (SCN-01…05) | CHK-6.3 |
| 6.4 | CPFR (CPF-01…05) | CHK-6.4 |
| 6.5 | laudo e portfólio (REL-01…05) | CHK-6.5: textos conferidos contra o mapeamento 07 |
| 6.6 | dashboard (DSH-01…05) | CHK-6.6: KPIs da demo = golden |
| 6.7 | exportações (EXP-01…05) | CHK-6.7: Excel relido pelo parser; CSV round-trip |
| **CHK-MACRO-6** | `verify` + o conjunto de `services/` não importa React/DOM (lint) | |

## ✅ M7 — Infra, estado e biblioteca de UI
| Sub | Entrega | CHK |
|---|---|---|
| 7.1 | `infra/storage.service`, `storageKeys` (PER-01…05) | CHK-7.1: cota simulada; versão inválida |
| 7.2 | `DatasetProvider`, `useDataset`, hooks memoizados | CHK-7.2: restaurar/limpar/falha de gravação |
| 7.3 | `useRoute` + `App` + menu + gaveta (SHL-01, 02, 06) | CHK-7.3: rotas e `aria-current`; 360 px sem rolagem horizontal |
| 7.4 | cartão de status, guarda de dados, toasts (SHL-03…05, 07) | CHK-7.4 |
| 7.5 | átomos: `Hero`, `Section`, `Badge`, `Callout`, `Metric`, `Card`, `WinnerCard`, `Expander` | CHK-7.5: testes de render |
| 7.6 | controles: `Select`, `MultiSelect`, `Segmented`, `Pills`, `Slider`, `RangeSlider`, `DateRange`, `FileDrop`, `Tabs` | CHK-7.6: teclado e `data-testid` |
| 7.7 | `DataTable` (ordenação, busca, barra/mini-gráfico/checkbox nas células), `ProgressBar`, `ChartFrame` | CHK-7.7 |
| 7.8 | tema/identidade (SHL-08, 09): logo, ícones, manifest | CHK-7.8 |
| **CHK-MACRO-7** | `verify`; app sobe e navega entre rotas vazias | |

## ✅ M8 — Telas (uma sub-etapa por tela; cada uma: página + testes de página + conferência de textos)
| Sub | Tela (specs) | CHK |
|---|---|---|
| 8.1 | Visão geral (PAG-01, 02) | CHK-8.1: textos do mapeamento 00 presentes (teste por `getByText`) |
| 8.2 | Importação (PAG-03…06) | CHK-8.2: fluxo com CSV da demo e com CSV mapeado |
| 8.3 | Análise histórica (PAG-07, 08) | CHK-8.3: 4 abas renderizam; janela reinicia |
| 8.4 | Previsão (PAG-09…12) | CHK-8.4: ★ no recomendado; KPIs = serviços |
| 8.5 | Comparação (PAG-13, 14) | CHK-8.5 |
| 8.6 | Cenários (PAG-15) | CHK-8.6 |
| 8.7 | CPFR (PAG-16) | CHK-8.7 |
| 8.8 | Dashboard (PAG-17, 18) | CHK-8.8 |
| 8.9 | Relatórios (PAG-19, 20) | CHK-8.9 |
| **CHK-MACRO-8** | `verify` + varredura de textos (script compara strings literais de `docs/mapeamento` com a UI) + `npm run build` | |

## ✅ M9 — Acabamento e ponta a ponta
| Sub | Entrega | CHK |
|---|---|---|
| 9.1 | Responsivo: 390, 768, 1024, 1280 px em todas as telas (gráficos, tabelas, filtros) | CHK-9.1: capturas Playwright sem rolagem horizontal da página |
| 9.2 | Desempenho: memoização, code-splitting por rota, SheetJS sob demanda | CHK-9.2: Lighthouse/tempo local; nenhum cálculo > 300 ms bloqueando entrada |
| 9.3 | Acessibilidade básica: foco visível, rótulos, contraste | CHK-9.3: checagem axe nas telas principais |
| 9.4 | E2E Playwright: demo → 8 telas sem erro de console; importação de CSV | CHK-9.4: `npm run e2e` verde |
| **CHK-MACRO-9** | `verify` + `e2e` + `build` | |

## M10 — Verificação final e execução na rede
| Sub | Entrega | CHK |
|---|---|---|
| 10.1 | CHANGELOG 1.0.0, versão, README, BACKLOG atualizados; status das specs sem pendências | CHK-10.1: `check:version`, `check:specs` |
| 10.2 | **CHK-FINAL:** `npm run verify` + `npm run build` + `npm run e2e` + varredura de textos + conferência visual 390 px/1280 px | todos verdes, saída anexada ao relatório |
| 10.3 | Servidor na rede local (`vite --host` em modo preview de produção) e URL por IP | CHK-10.3: `curl http://<ip>:<porta>/` = 200 de outra interface; mostra URL ao usuário |
| 10.4 | Relatório ao usuário: o que foi feito, paridade medida, divergências conhecidas, passos de teste no aparelho | |

**Não faz parte desta rodada:** push, PR e deploy no Railway (dependem de pedido explícito).
