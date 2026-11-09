# Tela 2 — Análise histórica (`#/analise`, `views/2_analise_historica.py`)

**Exige base.** Menu: Dados › "Análise histórica" (ícone query_stats).

## Estrutura

### 1. Hero
Rótulo **"Módulo 02 · Dados"** · Título **"Análise histórica"** · Subtítulo: "Entenda o comportamento de cada produto antes de prever: volume, variabilidade, tendência, sazonalidade e classificação automática do perfil de demanda."

### 2. Filtros (cartão, 3 colunas 2:2:3)
| Controle | Rótulo | Opções / padrão |
|---|---|---|
| Seletor | **"Produto (SKU)"** | SKUs em ordem alfabética; padrão: o primeiro |
| Controle segmentado | **"Granularidade"** | Diária · Semanal · Mensal; padrão **Semanal** (não permite ficar sem seleção) |
| Slider de intervalo | **"Janela de análise"** | de `min` a `max` da série na granularidade; formato `MM/AAAA`; padrão = tudo; **reinicia** ao trocar SKU ou granularidade |

`full = seriesFor(sku, freq)`; `serie = full` recortada pela janela (inclusive nas pontas; a janela compara por data).

### 3. Perfil
Linha: nome do SKU (1,25 rem/800) · badge **"Perfil: {classe}"** (tom por classe) · texto cinza "{motivo} · classificação sobre a série semanal completa".
Classe/motivo = `profile(sku, 'W')` — **sempre semanal completa** (P3).

### 4. KPIs (5 métricas) — calculados sobre `serie` (janela + granularidade)
| Rótulo | Valor | Detalhe |
|---|---|---|
| Volume no período | `fmt_int(soma)` | mini gráfico de área com as últimas 52 observações |
| Média por {dia\|semana\|mês} | `fmt_num(média)` | — |
| Pico | `fmt_int(máximo)` | dica "Em `DD/MM/AAAA`" (data do máximo) |
| Variabilidade (CV) | `fmt_num(cv, 2)` | dica "Desvio-padrão ÷ média. < 0,2 estável · > 0,5 irregular." |
| Crescimento | `fmt_pct(cresc, signed)` | delta "`{fmt_num(zerados,0)}% períodos zerados`" (neutro, sem seta); dica "Média da 2ª metade da janela vs. 1ª metade." |

Fórmulas: `média`; `cv = desvio_amostral / média` (0 se média ≤ 0); `meio = ⌊n/2⌋`; `m1 = média[0:meio]`, `m2 = média[meio:]`; `cresc = (m2 − m1) / m1 × 100` (0 se m1 ≤ 0); `zerados = % de pontos == 0`.

### 5. Abas

#### Aba "Série temporal" (show_chart)
Gráfico de 440 px com:
1. **Demanda real** (linha índigo, 1,6 px)
2. **Média móvel ({janela})** (linha verde-água, 2,6 px); janela = D 28 · W 8 · ME 3, `min_periods=1`
3. **Tendência linear** (âmbar tracejada, 2 px): reta de mínimos quadrados sobre o índice 0…n−1 (se n > 1)
4. Linha horizontal pontilhada na média com o rótulo **"média {fmt_num}"** (canto superior esquerdo)
5. Eixo Y **"Quantidade"**; seletor de janela (*range slider*) sob o gráfico

#### Aba "Sazonalidade" (calendar_month) — 2 gráficos (3:2), 360 px, usam **dados diários** do SKU na janela
- **"Mapa de calor · volume mensal por ano"**: matriz ano (linhas, ordem crescente de cima para baixo) × mês (Jan…Dez) com a soma mensal; escala `#EEF2FF → #818CF8 → #312E81`; dica `{ano} · {mês}` / `{valor} un.`; meses sem dados em branco.
- **"Índice por dia da semana (100 = média)"**: barras Seg…Dom com `média do dia da semana / média das médias × 100`; barra verde-água se ≥ 100, cinza #CBD5E1 se < 100; linha pontilhada em 100; dica `{dia}: índice {n}`.

#### Aba "Distribuição" (bar_chart) — 2 gráficos, 360 px
- **"Histograma de demanda ({granularidade em minúsculas})"**: 30 classes sobre `serie`; eixos "Quantidade" × "Frequência"; barras índigo.
- **"Dispersão por trimestre"**: *box plot* por T1…T4 (trimestre do calendário de cada ponto) com a paleta; sem legenda; eixo "Quantidade".

#### Aba "Comparar SKUs" (compare)
- Multisseleção **"SKUs para comparar"** (padrão: os 3 primeiros) e interruptor **"Normalizar (índice base 100)"** (ligado; dica "Facilita comparar produtos com escalas diferentes.").
- Gráfico de linhas (420 px), uma por SKU na cor da paleta (por posição na seleção), na granularidade e janela da tela; normalizado = `valor / média do SKU na janela × 100` (se média > 0). Eixo Y: **"Índice (100 = média)"** ou **"Quantidade"**.

## Particularidades
- A janela e a granularidade valem para KPIs/abas; o **perfil** não muda com elas (P3).
- Séries de granularidade mensal/semanal descartam períodos parciais nas pontas (SPEC-SER-04).
- Sem SKU selecionado na comparação → gráfico vazio (sem erro).
- Mobile: filtros empilhados; abas rolam na horizontal; slider de intervalo com alvos de 44 px.
