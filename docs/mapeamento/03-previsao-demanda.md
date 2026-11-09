# Tela 3 — Previsão de demanda (`#/previsao`, `views/3_previsao_demanda.py`)

**Exige base.** Menu: Planejamento › "Previsão de demanda" (ícone trending_up).

## Estrutura

### 1. Hero
Rótulo **"Módulo 03 · Planejamento"** · Título **"Previsão de demanda"** · Subtítulo: "Projete o futuro de cada produto com 7 modelos estatísticos. O sistema recomenda o método com melhor desempenho no backtesting e exibe faixas de confiança para apoiar decisões de estoque."

### 2. Filtros (cartão, 4 colunas 2:2,2:2,8:1,4)
| Controle | Rótulo | Opções / padrão |
|---|---|---|
| Seletor | **"Produto (SKU)"** | SKUs ordenados; primeiro |
| Segmentado | **"Granularidade"** | Diária · Semanal · **Mensal** (padrão) |
| Slider | **"Horizonte ({dias\|semanas\|meses})"** | 1 … `MAX_H[freq]`; padrão `DEFAULT_H[freq]`; valor guardado por granularidade |
| Segmentado | **"Confiança"** | **80%** (padrão) · 95% |

### 3. Pré-condição
`series = seriesFor(sku, freq)`. Se `len(series) < 6`: erro **"Histórico insuficiente para previsões estatísticas (mínimo de 6 períodos nessa granularidade)."** e a tela para.

### 4. Cálculo
Spinner **"Ajustando modelos estatísticos…"** enquanto roda:
- `resultados = runModels(series, h, SEASON[freq])` → por modelo: ajuste (`fit`), previsão (`forecast`, piso em 0), `sigma`.
- `recomendado, ranking = bestModel(series, freq)` (horizonte do backtest independente de `h` — P5).
`sigma` = desvio dos resíduos (`série − ajuste`, sem o 1º ponto, **ddof = 0**, ignorando NaN; 0 se há ≤ 1 resíduo); modelo sem ajuste → desvio amostral da série (ddof = 1).

### 5. Seletor de modelo
Pílulas **"Modelo estatístico"** com os modelos que produziram previsão (ordem de `runAll`); o recomendado aparece como **"★ {modelo}"** e é o padrão (senão, o primeiro). Legenda: "ℹ {MODEL_INFO[modelo]}" + (se recomendado) " · **Recomendado pelo backtesting.**". A escolha é guardada por (SKU, granularidade). Não permite ficar sem seleção.

### 6. Intervalo de confiança e KPIs
- `z = 1,2816` (80%) ou `1,96` (95%); `passos = √[1…h]`; `inf = max(0, fc − z·σ·min(passos,3))`; `sup = fc + z·σ·min(passos,3)`.
- Datas futuras: `futureIndex(series, h, freq)`.
- `ultimo = soma dos últimos h pontos` (se `n ≥ h`); `total = soma(fc)`; `var = (total − ultimo) / ultimo × 100` (indefinido se `ultimo` = 0).
- `wape` = WAPE do modelo escolhido no ranking do backtest (se o modelo está no ranking).

Quatro métricas:
| Rótulo | Valor | Detalhe |
|---|---|---|
| Demanda prevista ({h} {unidade}) | `fmt_int(total)` | delta `fmt_pct(var, signed) + " vs. período anterior"` (omitido se indefinido) |
| Média por {dia\|semana\|mês} | `fmt_num(média das previsões)` | — |
| Faixa {conf} (total) | `fmt_int(Σinf) – fmt_int(Σsup)` | — |
| Acurácia no backtest | `fmt_pct(100 − wape, 1)` ou `—` | dica "100% − WAPE medido em teste cego sobre o final do histórico." |

### 7. Gráfico principal (460 px)
Camadas, em ordem:
1. Faixa preenchida **"Intervalo {conf}"** (verde-água, 14% de opacidade, sem tooltip)
2. **"Histórico"** (linha #334155, 2 px) — últimos `max(4h, 24)` pontos
3. **"Ajuste do modelo"** (âmbar pontilhada 1,6 px) — **oculta por padrão** (clicável na legenda); só se o modelo tem ajuste
4. **"Previsão · {modelo}"** (verde-água, 3 px, marcadores de 6 px com borda branca), começando no último ponto histórico
5. Linha vertical tracejada no último ponto histórico com o rótulo **"início da previsão"**
6. Eixo Y **"Quantidade"**

### 8. Tabela e exportação (colunas 3:1)
- Expansor **"Tabela da previsão"** (table), recolhido: colunas `Período` (`DD/MM/AAAA`), `Previsão` (arredondada, localizada), `Limite inferior ({conf})`, `Limite superior ({conf})`.
- Botão primário **"Exportar Excel"** → `previsao_{sku}_{granularidade em minúsculas}.xlsx`, planilha **"Previsao"**.
- Botão **"Exportar CSV"** → `previsao_{sku}.csv` (UTF-8, sem índice).

### 9. Expansores
- **"Comparar todos os modelos neste horizonte"** (stacked_line_chart; 380 px): "Histórico" + uma linha por modelo (cores da paleta por posição; 3 px o modelo escolhido, 1,6 px os demais).
- **"Entenda os modelos"** (school): lista `- **{Modelo}** — {MODEL_INFO}` para os 7 e legenda "As faixas de confiança são estimadas a partir do desvio-padrão dos resíduos do ajuste no histórico."

## Particularidades
- Modelos que não podem ser ajustados (Média Móvel com < 3 pontos, Holt-Winters sem 2 ciclos) simplesmente não aparecem.
- O histórico exibido, o recorte e o cálculo de `ultimo` usam a mesma série (sem janela).
- Mobile: filtros empilhados; gráfico com altura reduzida (320 px) e legenda abaixo.

## Dados usados
`seriesFor` · `runModels` · `bestModel` · `futureIndex` · `toExcel` · `toCsv`.
