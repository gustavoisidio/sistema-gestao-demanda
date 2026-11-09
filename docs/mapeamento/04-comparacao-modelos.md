# Tela 4 — Comparação de modelos (`#/comparacao`, `views/4_comparacao_modelos.py`)

**Exige base.** Menu: Planejamento › "Comparação de modelos" (ícone leaderboard).

## Estrutura

### 1. Hero
Rótulo **"Módulo 04 · Planejamento"** · Título **"Comparação de modelos"** · Subtítulo: "Teste cego (out-of-sample): os modelos são treinados sem conhecer o final do histórico e avaliados contra a realidade escondida. Vence quem erra menos em dados que nunca viu." · Chips: MAE · RMSE · MAPE · WAPE · Viés · Tracking Signal

### 2. Filtros (cartão, 3 colunas 2:2:3)
| Controle | Rótulo | Opções / padrão |
|---|---|---|
| Seletor | **"Produto (SKU)"** | primeiro SKU |
| Segmentado | **"Granularidade"** | Diária · Semanal · **Mensal** |
| Slider | **"Períodos de teste ({unidade})"** | 1 … `max_h`; `max_h = max(1, min(MAX_H[freq], n − 4))`; padrão `min(DEFAULT_H[freq], max_h)`; valor guardado por granularidade |

### 3. Pré-condições (cada uma para a tela)
- `n ≤ h + 3` → erro **"Histórico insuficiente: a base tem {n} períodos e o teste usa {h}. Reduza os períodos de teste."**
- Backtest sem nenhum modelo → erro **"Nenhum modelo conseguiu calcular o horizonte selecionado."**

### 4. Cálculo
Spinner **"Executando backtesting de todos os modelos…"**. `backtest(series, h, SEASON[freq])`:
- `treino = série[:−h]`, `teste = série[−h:]`
- `runAll(treino, h, m)`; cada previsão com piso em 0; só entram modelos cuja previsão tem o tamanho do teste
- Métricas por modelo (ver SPEC-EVL); `Acurácia (%) = max(0, 100 − WAPE)`; ordenar por WAPE crescente (NaN por último); coluna `Posição` 1…k.

### 5. Vencedor e ranking (colunas 2:3)
**Coluna esquerda**
- Cartão verde-água **"Modelo vencedor"** · valor **"🏆 {modelo}"** · meta "WAPE de {fmt_pct(wape)} em {h} {unidade} de teste{ganho}"; `ganho = " · {fmt_num(g,0)}% menos erro que o Naive"` com `g = (WAPE_naive − WAPE_top) / WAPE_naive × 100`, só se o vencedor não é o Naive e `WAPE_naive > 0`.
- Duas métricas: **MAE** (`fmt_num`, dica "Erro médio absoluto, em unidades.") e **Viés** (`fmt_num(…, 0)`, dica "Soma (previsto − real). Positivo = superestima.").
- Callout do *tracking signal* do vencedor:
  - `|TS| > 4` → âmbar ⚠️ "Tracking signal de **{fmt_num(TS)}** — o modelo apresenta viés sistemático; monitore."
  - senão → verde ✅ "Tracking signal de **{fmt_num(TS)}** — dentro do controle (±4)."

**Coluna direita** — cartão **"Ranking de erro (WAPE)** — quanto menor, melhor"** com barras horizontais (300 px): modelos por WAPE crescente de cima para baixo; barra do vencedor verde-água, demais #C7D2FE; rótulo `fmt_pct` fora da barra; dica `{modelo}: {wape}%`; eixo X "WAPE (%)".

### 6. Visualização do teste cego
Seção **"Visualização do teste cego"** — "Histórico de treino, realidade escondida e as 3 melhores previsões." Gráfico de 430 px:
- **"Treino"** (#334155, 2 px) — últimos `max(3h, 24)` pontos do treino
- **"Realidade (teste)"** (#94A3B8, 3 px, marcadores 7 px)
- Faixa sombreada sobre a janela de teste com o rótulo **"janela de teste"**
- As **3 melhores previsões** nomeadas **"1º · {modelo}"**, **"2º · …"**, **"3º · …"**; cores verde-água, índigo, âmbar; a 1ª sólida de 3,2 px, as demais tracejadas de 2 px.

### 7. Tabela completa de métricas
Seção **"Tabela completa de métricas"**; colunas e formatos:
| Coluna | Título | Formato |
|---|---|---|
| Posição | # | inteiro |
| Modelo | Modelo | texto |
| Acurácia (%) | Acurácia | barra 0–100, `0,0%` |
| WAPE (%) | WAPE (%) | `0,0%` |
| MAE | MAE | 1 casa |
| RMSE | RMSE | 1 casa |
| MAPE (%) | MAPE (%) | `0,0%`; dica "Ignora períodos com demanda zero." |
| Viés (Bias) | Viés (Bias) | 0 casas |
| Tracking Signal | Tracking Signal | 2 casas |

### 8. Expansor "Como ler as métricas" (school)
- **WAPE** — erro absoluto total ÷ demanda total. Robusto para itens com zeros; métrica principal do ranking.
- **MAE / RMSE** — erro médio em unidades; o RMSE penaliza mais os grandes erros.
- **MAPE** — erro percentual médio (ignora períodos zerados).
- **Viés** — positivo indica superestimação (excesso de estoque); negativo, subestimação (ruptura).
- **Tracking Signal** — viés acumulado ÷ MAE. Fora de ±4 indica modelo descalibrado.

## Dados usados
`seriesFor` · `backtest` · `calculateMetrics`.
