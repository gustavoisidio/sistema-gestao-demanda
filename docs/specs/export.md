# Exportações

Implementação: `src/services/export/*`, `src/infra/download.ts`. Origem: `services.to_excel`, `download_button` das telas.

### SPEC-EXP-01 — Excel
**Regra:** `toExcel({ nomePlanilha: linhas[] })` gera um `.xlsx` válido com uma aba por chave (nome truncado em 31 caracteres), cabeçalho na 1ª linha, sem coluna de índice; datas gravadas como datas de calendário; `null`/`NaN` viram células vazias. Relê-lo com `parseSpreadsheet` devolve as mesmas linhas.

### SPEC-EXP-02 — CSV
**Regra:** `toCsv(linhas)` gera CSV UTF-8 com cabeçalho, separador vírgula, campos com vírgula/aspas escapados, datas `YYYY-MM-DD`, sem coluna de índice.

### SPEC-EXP-03 — Nomes de arquivo
**Regra:** previsão `previsao_{sku}_{granularidade em minúsculas}.xlsx` e `previsao_{sku}.csv`; cenário `cenario_{sku}.xlsx`; CPFR `cpfr_{sku}.xlsx`; laudo `laudo_{sku}.xlsx`, `historico_{sku}.csv`, `laudo_{sku}.txt`; portfólio `portfolio.xlsx`; modelo `modelo_importacao.csv`. Caracteres inválidos em nomes de arquivo (`/ \ : * ? " < > |`) viram `_`.

### SPEC-EXP-04 — Planilhas por exportação
**Regra:** nomes das abas: previsão `Previsao`; cenário `Cenario`; CPFR `CPFR`; laudo `Resumo`, `Metricas`, `Previsao`, `Historico`; portfólio `Portfolio` (sem a coluna de tendência).

### SPEC-EXP-05 — Download no navegador
**Regra:** `downloadFile(nome, conteudo, mime)` cria um `Blob`, dispara o download e libera a URL; funciona no Safari do iOS (link com `download` ou abertura em nova aba quando o atributo não é suportado).
