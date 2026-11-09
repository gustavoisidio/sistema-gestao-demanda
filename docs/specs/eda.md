# Análise exploratória e perfil de demanda

Implementação: `src/services/eda/*`. Origem: `eda.py`, `views/2_analise_historica.py`. Convenção estatística: onde o original usa `pandas.std()` o desvio é **amostral (ddof = 1)**; `n = 1` → `NaN`.

### SPEC-EDA-01 — Indicadores
**Regra:** `calcIndicators(valores)` devolve `total`, `media`, `maximo`, `minimo`, `desvio_padrao` (ddof 1), `cv = desvio/media` (0 se `media ≤ 0`), `crescimento_pct`, `periodos_zerados`, `pct_zerados` (fração 0–1). `crescimento_pct = (m2 − m1)/m1 × 100` com `meio = ⌊n/2⌋`, `m1 = média(valores[:meio])`, `m2 = média(valores[meio:])`; `0` se `m1 ≤ 0` ou indefinido.
**Casos de borda:** série constante → `cv = 0`; `n = 1` → `desvio = NaN`.

### SPEC-EDA-02 — Série vazia
**Regra:** `calcIndicators([])` devolve `null`; `classifyBehavior(null)` devolve `{ classe: 'Sem Dados', motivo: '' }`.

### SPEC-EDA-03 — Classificação do perfil
**Regra:** primeira regra verdadeira, nesta ordem: `pct_zerados > 0,30` → **Intermitente** ("Muitos períodos sem demanda."); `cv < 0,20` e `|crescimento| < 10` → **Estável** ("Baixa variabilidade."); `crescimento > 20` → **Crescente** ("Tendência de alta."); `crescimento < −20` → **Decrescente** ("Tendência de queda."); `cv ≥ 0,50` → **Irregular** ("Alta variabilidade (picos)."); senão **Sazonal/Variável** ("Variação moderada."). Comparações com `NaN` são falsas.
**Casos de borda:** valores exatamente nos limites (0,30; 0,20; 10; 20; 0,50).

### SPEC-EDA-04 — Perfil sempre semanal
**Regra:** `profile(registros, sku, freq = 'W')` calcula indicadores e classe sobre a série da granularidade pedida; as telas sempre passam `'W'` (a série semanal completa, sem janela).

### SPEC-EDA-05 — Tabela do portfólio
**Regra:** `portfolioTable(registros)` devolve uma linha por SKU em ordem alfabética: `sku`, `perfil`, `volumeTotal`, `mediaSemanal`, `cv`, `crescimentoPct` e `tendencia` (últimas 52 semanas arredondadas); SKU sem indicadores usa 0.

### SPEC-EDA-06 — KPIs da janela
**Regra:** `windowStats(serie)` devolve `volume`, `media`, `pico` (valor e data do máximo; primeira ocorrência), `cv` (0 se média ≤ 0), `crescimentoPct` (mesma regra da SPEC-EDA-01) e `pctZerados` (0–100) sobre os pontos recebidos.

### SPEC-EDA-07 — Média móvel
**Regra:** `rollingMean(valores, janela)` com `min_periods = 1`: cada ponto é a média dos até `janela` últimos pontos disponíveis. Janela por granularidade: D 28, W 8, ME 3.

### SPEC-EDA-08 — Tendência linear
**Regra:** `linearTrend(valores)` devolve a reta de mínimos quadrados sobre o índice `0…n−1`; com `n ≤ 1` devolve os próprios valores.

### SPEC-EDA-09 — Matriz mensal por ano
**Regra:** `monthlyByYear(registrosDiarios)` soma por (ano, mês) e devolve anos em ordem crescente × 12 meses; meses sem registros são `null`.

### SPEC-EDA-10 — Índice por dia da semana
**Regra:** `weekdayIndex(registrosDiarios)` calcula a média de cada dia da semana (segunda = 0 … domingo = 6; dia sem dados = `null`) e o índice `média_do_dia / média_das_médias × 100`; se a média das médias é 0, devolve as médias sem escalar.

### SPEC-EDA-11 — Histograma
**Regra:** `histogram(valores, 30)` devolve 30 classes de largura igual entre mínimo e máximo, com contagem e limites; todos os valores iguais → uma classe com tudo; série vazia → `[]`. (O Plotly escolhia "bins bonitos" aproximados; a migração usa 30 exatos — ADR 0001.)

### SPEC-EDA-12 — Dispersão por trimestre
**Regra:** `quarterBoxStats(serie)` devolve, para T1…T4 com dados, `min`, `q1`, `mediana`, `q3`, `max` por interpolação linear e *whiskers* a 1,5 × IQR com os pontos fora como `outliers`.

### SPEC-EDA-13 — Comparar SKUs
**Regra:** `compareSeries(registros, skus, freq, janela, normalizar)` devolve uma série por SKU (na ordem da seleção); normalizado = `valor / média do SKU na janela × 100` quando a média é > 0, senão o valor bruto.
