# Séries temporais

Implementação: `src/services/series/*`, `src/lib/dates.ts`. Origem: `services.series_for`, `services.future_index`.

### SPEC-SER-01 — Agregação por granularidade
**Regra:** `resample(registros, freq)` soma as quantidades por período: `D` = dia; `W` = semana **terminada no domingo** (rótulo = o domingo); `ME` = mês (rótulo = último dia do mês). A série vai do primeiro ao último período que contém dados e **preenche com 0** os períodos sem registro. Registros duplicados no mesmo dia são somados.
**Casos de borda:** um só registro → série de 1 ponto; datas fora de ordem.

### SPEC-SER-02 — Rótulos de período
**Regra:** semana de 2023-01-02 (segunda) a 2023-01-08 (domingo) tem rótulo `2023-01-08`; qualquer dia de fevereiro/2024 pertence ao rótulo `2024-02-29`.

### SPEC-SER-03 — Série de um SKU
**Regra:** `seriesFor(registros, sku, freq)` usa apenas os registros do SKU e as datas **desse SKU** (primeira e última) para decidir o recorte; SKU inexistente → série vazia.

### SPEC-SER-04 — Descarte de períodos parciais
**Regra:** para `W` e `ME` com mais de 2 períodos: `W` descarta o último período se o domingo-rótulo for posterior à última data do SKU e o primeiro se a primeira data do SKU for posterior à segunda-feira daquela semana; `ME` descarta o último se o fim do mês for posterior à última data e o primeiro se a primeira data não for dia 1. `D` nunca descarta. O teste da condição acontece antes de qualquer descarte (como no original).
**Casos de borda:** com a demo, `W` mantém os 208 períodos e `ME` descarta jan/2023 e dez/2026 (46 meses restantes).

### SPEC-SER-05 — Índice futuro
**Regra:** `futureIndex(serie, h, freq)` devolve os `h` rótulos seguintes ao último: `D` +1 dia; `W` +7 dias (domingos); `ME` fins de mês seguintes.
**Casos de borda:** virada de ano; fevereiro bissexto; `h = 0` → vazio.

### SPEC-SER-06 — Janela por datas
**Regra:** `sliceByDates(serie, inicio, fim)` mantém pontos com `inicio ≤ rótulo ≤ fim` (inclusive); janela vazia → série vazia.

### SPEC-SER-07 — Parâmetros por granularidade
**Regra:** constantes exportadas: `SEASON = {D:7, W:52, ME:12}`, `UNIT`, `UNIT_SING`, `DEFAULT_H = {D:30, W:12, ME:6}`, `MAX_H = {D:180, W:52, ME:24}`, `FREQ_LABELS = {D:'Diária', W:'Semanal', ME:'Mensal'}`.
