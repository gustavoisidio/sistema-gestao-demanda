# Cenários e CPFR

Implementação: `src/services/scenarios/*`, `src/services/cpfr/*`. Origem: `scenario_builder.py`, `views/6_cenarios_cpfr.py`. Mapeamento: [06-cenarios-cpfr](../mapeamento/06-cenarios-cpfr.md).

### SPEC-SCN-01 — Choque linear
**Regra:** `applyLinear(previsao, pct)` = cada valor × `(1 + pct/100)`; não altera a entrada.
**Casos de borda:** `−50` → metade; `0` → igual.
**Status:** planejado

### SPEC-SCN-02 — Promoção
**Regra:** `applyPromotion(previsao, indices, pct)` multiplica por `(1 + pct/100)` apenas as posições em `indices` que sejam `< len`; índices fora do intervalo são ignorados; não altera a entrada.
**Status:** planejado

### SPEC-SCN-03 — Cenário composto
**Regra:** `buildScenario(base, choque, semanasPromo, uplift)` aplica primeiro o choque e depois a promoção nas semanas escolhidas (numeração 1…h → índice `semana − 1`) e devolve `{ cenario, volumeBase, volumeCenario, incremental, variacaoPct, picoValor, picoIndice, efeito[] }`; `variacaoPct = 0` se `volumeBase = 0`.
**Status:** planejado

### SPEC-SCN-04 — Padrões de promoção
**Regra:** `defaultPromoWeeks(h)` = `[4, 8]` filtradas por `≤ h`; `clampPromoWeeks(semanas, h)` descarta as `> h`.
**Status:** planejado

### SPEC-SCN-05 — Tabela do cenário
**Regra:** `scenarioTable(...)` gera linhas `Semana n`, `Data`, `Base` e `Cenário` (arredondados), `Promoção` (booleano) e `Variação (%) = (cenário − base)/base × 100` (0 se base ≤ 0).
**Status:** planejado

### SPEC-CPF-01 — Previsão do sistema
**Regra:** `cpfrStatistical(serieSemanal, h)` = Média Móvel de janela 4 (SPEC-FCS-02) repetida `h` vezes e arredondada a inteiro; série com menos de 4 pontos devolve `null` (a tela mostra "Histórico insuficiente para o plano de consenso.").
**Status:** planejado

### SPEC-CPF-02 — Divergência
**Regra:** `buildConsensus(sistema, parceiro, tolerancia)` calcula por semana `div = (parceiro − sistema)/sistema × 100` (0 se `sistema ≤ 0`).
**Status:** planejado

### SPEC-CPF-03 — Status
**Regra:** `|div| < tolerância` → `Alinhado` ("✅ Alinhado"); senão `div > 0` → "🔺 Risco de ruptura" e `div < 0` → "🔻 Risco de excesso". Crítico = `|div| ≥ tolerância`.
**Casos de borda:** `|div|` exatamente igual à tolerância é crítico.
**Status:** planejado

### SPEC-CPF-04 — Agregados
**Regra:** `alinhadas = linhas − críticos`; `aderencia = (1 − críticos/linhas) × 100`; `totalParceiro`, `totalSistema`; `divergenciaTotal = (Σparceiro − Σsistema)/max(Σsistema, 1) × 100`.
**Status:** planejado

### SPEC-CPF-05 — Edição do plano
**Regra:** o valor inicial de `Plano do parceiro` é a estatística; só aceita inteiros `≥ 0` (entrada inválida ou negativa volta a 0; decimais são arredondados); as edições são guardadas por (SKU, horizonte): trocar a tolerância preserva, trocar SKU ou horizonte reinicia.
**Status:** planejado
