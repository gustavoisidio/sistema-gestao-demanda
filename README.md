# Demanda+ · Sistema de Gestão de Demanda

Aplicação web para previsão e gestão de demanda, voltada a processos de **S&OP** e **CPFR**. Do histórico de vendas ao plano consensado: importe a base, entenda o comportamento de cada produto, gere previsões com 7 modelos estatísticos, valide com backtesting e alinhe o plano com parceiros.

> Esta versão (React + Vite + TypeScript) é a migração do app original em Streamlit, que continua em [`legacy/streamlit/`](legacy/streamlit) como referência. Todo o cálculo roda no navegador — não há backend.

## Funcionalidades

| Seção | Módulo | O que faz |
|---|---|---|
| Início | Visão geral | Onboarding, KPIs do portfólio e perfil/tendência de cada SKU |
| Dados | Importação de dados | Upload CSV/Excel, mapeamento de colunas, auditoria de qualidade e modelo CSV |
| Dados | Análise histórica | Indicadores, perfil de demanda, média móvel, tendência, sazonalidade e distribuição |
| Planejamento | Previsão de demanda | 7 modelos, recomendação via backtesting, intervalos de confiança 80/95% e exportação |
| Planejamento | Comparação de modelos | Teste cego com ranking por WAPE, MAE, RMSE, MAPE, viés e tracking signal |
| Planejamento | Cenários e CPFR | Simulação de choques e promoções; plano de consenso editável com alertas |
| Gestão | Dashboard gerencial | Filtros, variação 30 dias/12 meses, ranking, participação, evolução mensal e heatmap |
| Gestão | Relatórios e laudos | Laudo gerencial automático, visão do portfólio e exportação Excel/CSV/TXT |

## Formato dos dados

Uma linha por **produto × data**: colunas `sku`, `data`, `quantidade_vendida` (nomes diferentes podem ser mapeados na importação). Valores nulos e negativos viram 0, datas inválidas são descartadas e duplicidades são sinalizadas. A base de demonstração (5 produtos, 4 anos de histórico diário) é carregada pelo botão **Carregar demonstração**.

## Como rodar

Requer Node 22+.

```bash
npm install
npm run dev          # desenvolvimento (aceita acesso pela rede local)
npm run verify       # versão + specs + tipos + lint + testes
npm run build        # build de produção em dist/
npm run serve:lan    # build + servidor de produção acessível por IP na rede local
```

## Como o projeto é organizado

Desenvolvimento orientado a especificação — leia o [AGENTS.md](AGENTS.md) antes de qualquer mudança.

| Pasta | Conteúdo |
|---|---|
| `docs/mapeamento/` | Inventário das telas, textos e fórmulas do sistema original |
| `docs/specs/` | Requisitos `SPEC-*` (cada um com teste que o cita) |
| `docs/plans/` | Plano de migração em macro-etapas e sub-etapas com checagens |
| `docs/adr/` | Decisões de arquitetura e de produto |
| `docs/BACKLOG.md` | Itens adiados |
| `src/` | `types`, `lib`, `services` (puros), `infra`, `store`, `hooks`, `components`, `pages` |
| `legacy/streamlit/` | Código Python original (somente referência) |

## Deploy

`Dockerfile` (build com Node + nginx) pronto para o Railway. O deploy só é feito após a validação em aparelho externo.

## Tecnologias

React 19 · Vite · TypeScript · Tailwind CSS 4 · Recharts · PapaParse · SheetJS · Vitest · Playwright
