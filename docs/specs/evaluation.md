# Avaliação: métricas e backtest

Implementação: `src/services/evaluation/*`. Origem: `evaluator.py`, `services.backtest`, `services.best_model`.

### SPEC-EVL-01 — Métricas de erro
**Regra:** com `e = real − previsto`: `MAE = média(|e|)`; `MSE = média(e²)`; `RMSE = √MSE`; `MAPE (%) = média(|e/real|) × 100` só sobre `real ≠ 0` (`NaN` se não houver); `WAPE (%) = Σ|e| / Σreal × 100` (`NaN` se `Σreal ≤ 0`); `Viés (Bias) = Σ(previsto − real)`; `Tracking Signal = Σe / MAE` (0 se `MAE = 0`).
**Casos de borda:** previsão perfeita (todas 0 e `TS = 0`); real todo zero (MAPE e WAPE `NaN`).
**Status:** planejado

### SPEC-EVL-02 — Backtest (teste cego)
**Regra:** `backtest(serie, h, m)` separa `treino = serie[:−h]`, `teste = serie[−h:]`; roda `runAll(treino, h, m)`; limita cada previsão a `≥ 0`; mantém só modelos cuja previsão tem o tamanho do teste; calcula as métricas contra o teste.
**Casos de borda:** `h ≥ n` → sem modelos.
**Status:** planejado

### SPEC-EVL-03 — Ranking e acurácia
**Regra:** a tabela do backtest inclui `Acurácia (%) = max(0, 100 − WAPE)` (indefinida se WAPE é `NaN`), é ordenada por WAPE crescente (`NaN` por último, empate preserva a ordem de `runAll`) e recebe `Posição` 1…k. Tabela vazia quando nenhum modelo calcula.
**Status:** planejado

### SPEC-EVL-04 — Melhor modelo
**Regra:** `bestModel(serie, freq, h?)`: `m = SEASON[freq]`, `n = len`; `h_bt = h ?? min(max(⌊n·0,2⌋, 3), 12)`, depois `min(h_bt, max(n − 4, 1))`; com `n < 6` devolve `{ modelo: null, tabela: [] }`; senão o primeiro do ranking. É a **única** regra usada pela Previsão, pelo laudo e pelo portfólio (P4).
**Status:** planejado

### SPEC-EVL-05 — Ganho sobre o Naive
**Regra:** `gainOverNaive(tabela)` = `(WAPE_naive − WAPE_top)/WAPE_naive × 100` quando o vencedor não é o Naive e `WAPE_naive > 0`; senão `null`.
**Status:** planejado

### SPEC-EVL-06 — Sinal de acompanhamento
**Regra:** `trackingSignalStatus(ts)` = `'viés'` se `|ts| > 4` e `'controle'` caso contrário (4 exato é "controle").
**Status:** planejado
