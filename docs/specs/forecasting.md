# Modelos de previsão

Implementação: `src/services/forecasting/*`, `src/lib/optimize.ts`. Origem: `forecasting.py`, `services.run_models`. Entradas e saídas são arrays de `number`; `h` = horizonte (períodos); `m` = período sazonal. Cada modelo devolve `{ fit, forecast }` onde `fit` tem o tamanho da série (ou é `null`).

Dados de referência: `src/services/forecasting/__golden__/*.json`, gerados com o código Python original (statsmodels 0.14.6, scikit-learn, pandas 2.3.3) sobre a base de demonstração e séries sintéticas. O script gerador fica em `scripts/golden/` e **não** roda no CI.

### SPEC-FCS-01 — Naive
**Regra:** `fit[0] = y[0]`, `fit[t] = y[t−1]`; `forecast` = último valor repetido `h` vezes.
**Casos de borda:** série de 1 ponto.
**Status:** planejado

### SPEC-FCS-02 — Média Móvel (janela 3)
**Regra:** com `n < janela` retorna "indisponível" (`null`). Senão `rolling[t]` = média de `y[t−2..t]` (a partir de `t = 2`); `fit[t] = rolling[t−1]` e os primeiros valores sem média são preenchidos com o primeiro valor disponível (`fit[0..janela] = rolling[2]`); `forecast` = `fit[n−1]` repetido `h` vezes — ou seja, a média de `y[n−4..n−2]` (**particularidade P1**: a última observação fica fora; preservada para paridade, ver BKL-02).
**Casos de borda:** `n = 3` → `fit` inteiro = média das 3; janela 4 (CPFR) usa o mesmo procedimento com `janela = 4`.
**Status:** planejado

### SPEC-FCS-03 — SES (α = 0,2 fixo)
**Regra:** `l[−1] = l0`, `fit[t] = l[t−1]`, `l[t] = α·y[t] + (1−α)·l[t−1]`; `forecast = l[n−1]` repetido. O nível inicial segue o statsmodels: `n ≥ 10` → `intercepto − inclinação` da regressão linear (índices `0…9`) sobre as 10 primeiras observações (equivale ao valor ajustado em `t = −1`); `n < 10` → `y[0]`.
**Casos de borda:** série constante → previsão = a constante.
**Status:** planejado

### SPEC-FCS-04 — Holt (tendência aditiva)
**Regra:** recursões `fit[t] = l[t−1] + b[t−1]`; `l[t] = α·y[t] + (1−α)(l[t−1] + b[t−1])`; `b[t] = β(l[t] − l[t−1]) + (1−β)·b[t−1]`; `forecast[k] = l[n−1] + k·b[n−1]` (`k = 1…h`). `α, β ∈ [0, 1]` e estados iniciais `l0, b0` são estimados minimizando a soma dos quadrados dos erros de um passo (SSE).
**Casos de borda:** série com 2 pontos (ajuste exato); série constante (`b = 0`).
**Status:** planejado

### SPEC-FCS-05 — Holt-Winters (tendência e sazonalidade aditivas)
**Regra:** `fit[t] = l[t−1] + b[t−1] + s[t−m]`; `l[t] = α(y[t] − s[t−m]) + (1−α)(l[t−1] + b[t−1])`; `b[t] = β(l[t] − l[t−1]) + (1−β)·b[t−1]`; `s[t] = γ(y[t] − l[t−1] − b[t−1]) + (1−γ)·s[t−m]`; `forecast[k] = l[n−1] + k·b[n−1] + s[n−1+k−m]` (índice sazonal cíclico). `α, β, γ ∈ [0, 1]`; `l0, b0, s0…s(m−1)` estimados por SSE com a restrição `Σs0 = 0` (a restrição não altera o ajuste: apenas elimina a ambiguidade entre nível e sazonalidade).
**Casos de borda:** `n < 2m` → "indisponível" (`null`), como o statsmodels (que falha sem dois ciclos completos); modelo omitido do conjunto.
**Status:** planejado

### SPEC-FCS-06 — Regressão linear
**Regra:** reta de mínimos quadrados sobre `t = 0…n−1`; `fit[t] = max(0, a + b·t)`; `forecast[k] = max(0, a + b·(n−1+k))`.
**Casos de borda:** `n = 1` → reta constante; série constante.
**Status:** planejado

### SPEC-FCS-07 — Croston
**Regra:** sem nenhuma observação `> 0`: `fit = y` e `forecast = zeros(h)`. Senão, com `α = 0,1`, `q = 1`, `nz0` = índice da primeira observação `> 0`: `level[0] = y[nz0]`, `period[0] = 1` se `nz0 = 0` senão `nz0`, `fit[0] = level[0]/period[0]`. Para `t ≥ 1`: se `y[t] > 0` → `level[t] = α·y[t] + (1−α)·level[t−1]`, `period[t] = α·q + (1−α)·period[t−1]`, `q = 1`; senão `level[t] = level[t−1]`, `period[t] = period[t−1]`, `q += 1`; `fit[t] = level[t]/period[t]`. `forecast = level[n−1]/period[n−1]` (0 se `period[n−1] ≤ 0`) repetido `h` vezes.
**Status:** planejado

### SPEC-FCS-08 — Conjunto de modelos
**Regra:** `runAll(y, h, m)` roda, nesta ordem, Naive, Média Móvel, SES, Holt, Holt-Winters, Regressão, Croston; modelos indisponíveis (`null`) ou que lançam erro são **omitidos** (nunca derrubam a tela).
**Casos de borda:** com `n < 3` não há Média Móvel; com `n < 2m` não há Holt-Winters.
**Status:** planejado

### SPEC-FCS-09 — Previsões prontas para uso
**Regra:** `runModels(y, h, m)` devolve para cada modelo `{ fit, forecast, sigma }` com `forecast` limitado a `≥ 0` (`max(0, ·)`) e `fit` como array de números; `sigma` = desvio-padrão populacional (ddof 0, ignorando `NaN`) dos resíduos `y − fit` sem o 1º ponto; com ≤ 1 resíduo, `0`; modelo sem ajuste usa o desvio amostral da série.
**Status:** planejado

### SPEC-FCS-10 — Otimização e tolerâncias
**Regra:** `fitHolt`/`fitHoltWinters` minimizam o SSE com busca simplex (Nelder–Mead) limitada a `[0,1]` sobre os parâmetros de suavização; os estados iniciais saem de mínimos quadrados lineares condicionados aos parâmetros. Contra os dados de referência: **o SSE obtido ≤ SSE do statsmodels × (1 + 1e-6)** e, na base de demonstração, a previsão total (soma do horizonte) fica dentro de **5%** da do statsmodels para Holt e Holt-Winters e de **0,01%** para SES. Naive, Média Móvel, Regressão e Croston batem com a referência em **1e-9**.
**Casos de borda:** parâmetros no limite (α → 0 ou 1) são válidos.
**Status:** planejado

### SPEC-FCS-11 — Determinismo e desempenho
**Regra:** mesma entrada → mesma saída (sem aleatoriedade). Ajustar os 7 modelos para uma série semanal de 208 pontos com `m = 52` leva menos de 1,5 s em Node (orçamento de teste).
**Status:** planejado

### SPEC-FCS-12 — Intervalo de confiança
**Regra:** `confidenceBand(forecast, sigma, nivel)` com `z = 1,2816` (80%) ou `1,96` (95%): `fator[i] = min(√(i+1), 3)`; `inf[i] = max(0, fc[i] − z·σ·fator[i])`; `sup[i] = fc[i] + z·σ·fator[i]`. (P6)
**Status:** planejado

### SPEC-FCS-13 — Entradas inválidas
**Regra:** série vazia, `h < 1` ou valores não finitos retornam conjunto vazio de modelos (nunca `NaN` na saída).
**Status:** planejado
