# Laudo, portfólio e dashboard

Implementação: `src/services/reports/*`, `src/services/dashboard/*`. Origem: `views/7_relatorios.py`, `views/5_dashboard_gerencial.py`.

### SPEC-REL-01 — Recomendações do laudo
**Regra:** `recommendations(classe, metricas, modelo, totalReal)` devolve, em ordem: (1) o texto da classe (tabela do mapeamento 07; `Sem Dados` não gera linha); (2) a linha de viés com `bias_pct = Viés/totalReal × 100` (0 se `totalReal = 0`): `> 5` superestima, `< −5` subestima, senão "sob controle"; (3) a linha "🎯 Com base no backtesting, recomenda-se adotar o método **{modelo}** no planejamento.". O texto é entregue em marcação mínima (`**negrito**`) e convertido para HTML/TXT na saída.
**Casos de borda:** `bias_pct` exatamente 5 ou −5 → "sob controle".
**Status:** planejado

### SPEC-REL-02 — Texto do laudo
**Regra:** `reportText(sku, geradoEm, recomendacoes)` = `LAUDO DE DEMANDA — {sku}\nGerado em {DD/MM/AAAA HH:MM}\n\n` + uma linha `- {texto sem negrito}` por recomendação separadas por `\n`.
**Status:** planejado

### SPEC-REL-03 — Laudo completo de um SKU
**Regra:** `buildReport(registros, sku, agora)` usa a série semanal, `profile`, `bestModel` (SPEC-EVL-04) e a previsão de 12 semanas do modelo recomendado (zeros se não existir); devolve indicadores, métricas do backtest, projeção, `acuracia = 100 − WAPE`, `totalReal` (soma do teste) e as recomendações. `agora` entra por parâmetro.
**Status:** planejado

### SPEC-REL-04 — Resumo do laudo (planilha)
**Regra:** `reportSummary(...)` gera os pares Indicador/Valor, em ordem: SKU, Perfil, Motivo, Volume total, Média semanal (2 casas), Coef. variação (3), Crescimento (%) (2), Modelo recomendado, WAPE (%) (2); valores como texto.
**Status:** planejado

### SPEC-REL-05 — Visão do portfólio
**Regra:** `portfolioReport(registros)` devolve por SKU (ordem alfabética): `sku`, `perfil`, `modelo` (ou `—`), `acuracia` (`100 − WAPE` do 1º; `null` se não há), `vies`, `volume52` (soma das últimas 52 semanas) e `tendencia` (últimas 52 semanas); aceita callback de progresso `(i, total, sku)`.
**Status:** planejado

### SPEC-DSH-01 — Filtro do dashboard
**Regra:** `filterBase(registros, skus, ini, fim)` mantém registros dos SKUs escolhidos (vazio = todos) com `ini ≤ data ≤ fim`; intervalo incompleto usa o intervalo total da base.
**Status:** planejado

### SPEC-DSH-02 — KPIs do dashboard
**Regra:** `dashboardKpis(base)` com `ultimo` = maior data: `r30` = soma de `(ultimo−30d, ultimo]`; `p30` = `(ultimo−60d, ultimo−30d]`; `delta30 = (r30−p30)/p30×100` (`null` se `p30 = 0`); `ano` = `(ultimo−365d, ultimo]`; `anoAnt` = `(ultimo−730d, ultimo−365d]`; `yoy` (`null` se `anoAnt = 0`); `mediaDiaria` = média das somas por data; `campeao` = SKU de maior volume e `participacao` (%).
**Status:** planejado

### SPEC-DSH-03 — Volume por produto e participação
**Regra:** `volumeBySku(base)` ordena por volume decrescente; a cor de cada SKU é a posição do SKU na lista completa de SKUs da base (módulo 8) — estável com filtros.
**Status:** planejado

### SPEC-DSH-04 — Evolução mensal
**Regra:** `monthlyBySku(base, ultimo)` soma por (mês, SKU) e **omite meses cujo fim de mês é posterior ao último dia dos dados**; `mensal` (total por mês) usa a mesma regra. Modo "Participação %" normaliza cada mês para 100.
**Status:** planejado

### SPEC-DSH-05 — Intensidade mensal
**Regra:** `intensityIndex(mensalPorSku)` = `valor / média do SKU × 100` por (SKU, mês); SKU com média 0 → `null`.
**Status:** planejado
