# Tela 7 — Relatórios e laudos (`#/relatorios`, `views/7_relatorios.py`)

**Exige base.** Menu: Gestão › "Relatórios e laudos" (ícone description).

## Estrutura

### 1. Hero
Rótulo **"Módulo 10 · Gestão"** · Título **"Relatórios e laudos"** · Subtítulo: "O sistema analisa o histórico, executa o backtesting de todos os modelos e redige um laudo gerencial automático — pronto para embasar reuniões de S&OP."

### 2. Abas
**"Laudo por produto"** (description) · **"Visão do portfólio"** (inventory).

---

## Aba 1 — Laudo por produto

### Controles (cartão, colunas 3:1)
- Seletor **"Produto para o laudo"**
- Botão primário **"Gerar laudo"** (auto_awesome): marca o SKU atual como "gerado".

Enquanto o SKU selecionado ≠ SKU gerado: info **"Selecione o produto e clique em **Gerar laudo**."** (touch_app). Trocar o SKU depois de gerar volta a esse estado.

### Geração (painel de status "Compilando laudo…")
Etapas exibidas: "Agregando histórico semanal…" → "Executando backtesting de 7 modelos…" → "Projetando as próximas 12 semanas…" → rótulo final **"Laudo pronto"** (concluído, recolhido).
Cálculo (série semanal, `m = 52`):
1. `ind, classe, motivo = profile(sku, 'W')`
2. `melhor = bestModel(série)` (P4): primeiro do ranking do backtest (horizonte `h_bt = min(max(⌊n·0,2⌋,3),12)`, limitado por `n − 4`)
3. `proj` = previsão do modelo `melhor` para 12 semanas (`runModels(série, 12, 52)`; vetor de zeros se o modelo não existir)

### Cartão do laudo
- Rótulo **"Laudo automático · DD/MM/AAAA HH:MM"** (momento da geração) · nome do SKU (1,4 rem/800)
- Badges: **"Perfil: {classe}"** e **"Modelo: {modelo}"** (teal)
- Título **"Recomendações"** e lista (ver regras abaixo)

### KPIs (5)
| Rótulo | Valor | Dica |
|---|---|---|
| Volume total | `fmt_int(ind.total)` | — |
| Média semanal | `fmt_num(ind.media)` | — |
| CV | `fmt_num(ind.cv, 2)` | — |
| Acurácia validada | `fmt_pct(100 − WAPE)` | "100% − WAPE no teste cego" |
| Previsão 12 semanas | `fmt_int(Σ proj)` | — |

### Gráfico (340 px)
**"Últimas 52 semanas"** (#334155, 2 px) e **"Projeção · {modelo}"** (verde-água, 3 px) partindo do último ponto.

### Recomendações (`recomendacoes(classe, métricas, modelo, totalReal)`)
`totalReal` = soma do conjunto de teste do backtest. Linhas, na ordem:
1. Por classe (HTML com `<b>`):
   - **Crescente** — "O produto apresenta **tendência clara de crescimento**; revise níveis de estoque de segurança e capacidade de reposição."
   - **Decrescente** — "O produto apresenta **tendência de queda**; avalie redução de compras e risco de obsolescência."
   - **Estável** — "A demanda é **estável**; modelos de média móvel ou suavização simples tendem a performar muito bem."
   - **Intermitente** — "Demanda **intermitente** (muitos períodos zerados); o método de Croston e o WAPE são os mais indicados."
   - **Irregular** — "Demanda **irregular**, com picos; considere estoque de segurança maior e revisão frequente do plano."
   - **Sazonal/Variável** — "Demanda com **variação moderada/sazonal**; antecipe a cobertura para os períodos de pico."
   - (Sem Dados: nenhuma linha de classe)
2. Viés: `bias_pct = Viés / totalReal × 100` (0 se `totalReal` = 0):
   - `> 5` → "⚠️ O modelo tende a **superestimar** a demanda ({fmt_pct(bias_pct, signed)}) — risco de excesso de estoque."
   - `< −5` → "⚠️ O modelo tende a **subestimar** a demanda ({…}) — risco de ruptura e venda perdida."
   - senão → "O viés do modelo está **sob controle** ({…} do volume real no teste)."
3. "🎯 Com base no backtesting, recomenda-se adotar o método **{modelo}** no planejamento."

### Downloads (3 botões, colunas iguais)
| Botão | Arquivo | Conteúdo |
|---|---|---|
| **"Laudo completo (Excel)"** (primário) | `laudo_{sku}.xlsx` | Planilhas **Resumo** (Indicador/Valor), **Metricas** (ranking do backtest), **Previsao** (Semana, Previsão), **Historico** (série semanal) |
| **"Histórico semanal (CSV)"** | `historico_{sku}.csv` | série semanal (data, valor) |
| **"Laudo em texto (TXT)"** | `laudo_{sku}.txt` | `LAUDO DE DEMANDA — {sku}\nGerado em {DD/MM/AAAA HH:MM}\n\n` + uma linha `- {recomendação sem <b>}` por item |

Planilha **Resumo** (valores como texto): SKU · Perfil · Motivo · Volume total · Média semanal (2 casas) · Coef. variação (3) · Crescimento (%) (2) · Modelo recomendado · WAPE (%) (2).

---

## Aba 2 — Visão do portfólio

Texto: "Backtesting consolidado de todos os produtos (base semanal) com o modelo vencedor de cada um."
Barra de progresso **"Avaliando portfólio…"** → "Avaliando {sku}…" por SKU. Para cada SKU (ordem alfabética): série semanal, classe, `bestModel(série, 'W')`.

Tabela:
| Coluna | Conteúdo |
|---|---|
| SKU | texto |
| Perfil | classe |
| Modelo recomendado | modelo ou `—` |
| Acurácia | barra 0–100, `0,0%` (`100 − WAPE` do 1º colocado; vazio se não há) |
| Viés | 0 casas |
| Volume 52 sem. | inteiro localizado (soma das últimas 52 semanas) |
| Últimas 52 semanas | mini linha com as 52 últimas semanas |

Botão primário **"Exportar visão do portfólio (Excel)"** → `portfolio.xlsx`, planilha **"Portfolio"** (sem a coluna de tendência).

## Particularidades
- O horário do laudo vem do relógio do aparelho no momento do clique (entra por parâmetro nos serviços — testável).
- A aba do portfólio recalcula a cada abertura no original; na migração é memoizada por base.
- Mobile: os botões de download empilham em largura total.

## Dados usados
`profile` · `bestModel` · `runModels` · `recommendations` · `reportText` · `portfolioReport` · `toExcel`.
