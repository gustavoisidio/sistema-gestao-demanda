# Dados: leitura, validação e tratamento

Implementação: `src/services/data/*`. Origem: `data_processor.py`, `views/1_importacao.py`. Mapeamento: [01-importacao](../mapeamento/01-importacao.md).

### SPEC-DAT-01 — Normalização de colunas
**Regra:** nomes de coluna viram minúsculos e espaços viram `_` (`"Quantidade Vendida"` → `quantidade_vendida`). BOM no início do arquivo é descartado. Colunas extras são mantidas na leitura bruta.

### SPEC-DAT-02 — Leitura de CSV
**Regra:** `parseCsvText(texto)` devolve `{ columns, rows }` com todas as linhas não vazias; detecta o delimitador (`,` `;` tab); texto sem cabeçalho ou sem linhas de dados retorna erro legível.
**Casos de borda:** linhas totalmente vazias são ignoradas; campos com aspas e vírgulas internas; CRLF.

### SPEC-DAT-03 — Leitura de planilha
**Regra:** `parseSpreadsheet(arrayBuffer)` lê a **primeira aba** de `.xlsx`/`.xls`, usa a primeira linha como cabeçalho e devolve o mesmo formato do CSV; células de data viram `YYYY-MM-DD`.

### SPEC-DAT-04 — Extensões aceitas
**Regra:** `loadFile(file)` escolhe o leitor pela extensão (`csv`, `xlsx`, `xls`, sem diferenciar maiúsculas); outra extensão retorna o erro `Formato não suportado.`; falha de leitura retorna `{ ok: false, message }` — nunca lança para a interface.

### SPEC-DAT-05 — Mapeamento de colunas
**Regra:** `missingRequired(columns)` lista, na ordem `sku`, `data`, `quantidade_vendida`, as colunas obrigatórias ausentes; `mappingOptions(columns)` lista as colunas do arquivo que **não** têm nome padrão; `applyMapping(rows, mapping)` renomeia a coluna escolhida para o nome padrão sem alterar os valores.
**Casos de borda:** mapeamento incompleto não é aplicável (`isMappingComplete` falso); a mesma coluna escolhida para dois campos é rejeitada.

### SPEC-DAT-06 — Valores numéricos
**Regra:** `parseQuantity(texto)` aceita `1234.5` e `1234,5` (e milhar `1.234,5`), espaços ao redor e `R$`; vazio ou não numérico → `null` (conta como nulo).
**Casos de borda:** `"-50"` → `-50`; `"abc"` → `null`; `""` → `null`.

### SPEC-DAT-07 — Datas aceitas
**Regra:** `parseDate(texto)` aceita `YYYY-MM-DD` (com hora opcional), `YYYY/MM/DD`, `DD/MM/YYYY`, `DD-MM-YYYY` e números de série do Excel; devolve `YYYY-MM-DD` ou `null`. Datas impossíveis (`2025-02-30`) são `null`.
**Origem:** o original usava `pd.to_datetime` (inferência ampla, ambígua em `01/02/2025`); a migração assume **dia/mês/ano** (decisão registrada no ADR 0001).

### SPEC-DAT-08 — Validação (auditoria)
**Regra:** `validateData(rows)` retorna `{ nulos, negativos, duplicadas, datasInvalidas, todasDatasInvalidas }`: `nulos` = quantidades vazias/não numéricas; `negativos` = quantidades `< 0`; `duplicadas` = linhas cujo par (`sku`, `data`) já apareceu antes (2ª ocorrência em diante); `datasInvalidas` = datas não interpretáveis; `todasDatasInvalidas` é verdadeiro quando **nenhuma** data é válida.
**Origem:** o original bloqueava a importação com **uma** data inválida, contradizendo o README (que diz que datas inválidas são descartadas); a migração bloqueia só quando nenhuma data é válida (ADR 0001).

### SPEC-DAT-09 — Tratamento padrão
**Regra:** `applyDefaultTreatment(rows)` devolve `SaleRecord[]`: descarta linhas com `sku` vazio ou `data` inválida; quantidade vazia → `0`; negativa → `0`; ordena por `sku` (ordem alfabética estável) e `data`; **mantém duplicatas**; não altera a entrada.

### SPEC-DAT-10 — Resumo da base
**Regra:** `datasetSummary(records)` → `{ registros, skus, inicio, fim, volume }` (`inicio`/`fim` = menor/maior `data`; `volume` = soma das quantidades).

### SPEC-DAT-11 — Índice de qualidade
**Regra:** `qualityScore(problemas, linhasBrutas)` = `max(0, 100 − problemas / max(linhasBrutas, 1) × 100 × 10)`, com `problemas = nulos + negativos + duplicadas`.
**Casos de borda:** 0 problemas → 100; 10% de problemas → 0; linhas = 0 não divide por zero.

### SPEC-DAT-12 — Modelo CSV
**Regra:** `templateCsv()` devolve exatamente `sku,data,quantidade_vendida\nPROD_A,2025-01-01,120\nPROD_A,2025-01-02,98\nPROD_B,2025-01-01,40\n`.

### SPEC-DAT-13 — Base de demonstração
**Regra:** a demo carrega `demo_dataset.csv` (7.280 linhas; 5 SKUs: Agua Mineral 500ml, Camiseta Promocional, Placa Mae Servidor, Protetor Solar FPS50, Smartphone TechX; 2023-01-02 a 2026-12-27) sob demanda, aplica o tratamento padrão e define a origem `Base de demonstração`.

### SPEC-DAT-14 — Origem do arquivo
**Regra:** a origem de uma base importada é `Arquivo · {nome}`; a da demonstração é `Base de demonstração`.
