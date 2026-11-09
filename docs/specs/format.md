# Formatação pt-BR

Implementação: `src/lib/format.ts`, `src/lib/dates.ts`. Todos os textos numéricos e de data da interface passam por aqui.

### SPEC-FMT-01 — Inteiros
**Regra:** `fmtInt(x)` arredonda para 0 casas (meio para cima como `toFixed`) e usa `.` como separador de milhar. Entrada inválida (`null`, `undefined`, `NaN`, texto) retorna `—`.
**Casos de borda:** `1234567` → `1.234.567`; `-1500` → `-1.500`; `0` → `0`; `NaN` → `—`.

### SPEC-FMT-02 — Decimais
**Regra:** `fmtNum(x, dec = 1)` usa `dec` casas, `.` de milhar e `,` decimal. Entrada inválida → `—`.
**Casos de borda:** `1234.5` → `1.234,5`; `fmtNum(0.256, 2)` → `0,26`.

### SPEC-FMT-03 — Percentuais
**Regra:** `fmtPct(x, dec = 1, signed = false)` = `fmtNum(x, dec) + '%'`; `NaN`/inválido → `—`; com `signed`, valores positivos recebem `+` (zero e negativos não).
**Casos de borda:** `12.34` signed → `+12,3%`; `-5` → `-5,0%`; `0` signed → `0,0%`.

### SPEC-FMT-04 — Datas de calendário
**Regra:** `fmtDate('YYYY-MM-DD')` → `DD/MM/AAAA`; `fmtMonthYear` → `MM/AAAA`; `fmtMonthYearShort` → `MM/AA`; `fmtDateTime(Date)` → `DD/MM/AAAA HH:MM` (relógio local). Nenhuma delas depende do fuso do aparelho para datas de calendário.

### SPEC-FMT-05 — Aritmética de datas sem fuso
**Regra:** `lib/dates` trabalha com strings `YYYY-MM-DD` e índices de dia UTC: `toDayIndex`, `fromDayIndex`, `addDays`, `weekdayMon0` (segunda = 0), `endOfWeekSunday`, `endOfMonth`, `startOfMonth`, `quarterOf`, `monthOf`, `yearOf`, `diffDays`. Resultados independem de `TZ`.
**Casos de borda:** anos bissextos; 31/12 → 01/01; `endOfMonth('2024-02-10')` = `2024-02-29`; `endOfWeekSunday` de um domingo é ele mesmo.
