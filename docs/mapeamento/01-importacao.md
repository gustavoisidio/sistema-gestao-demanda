# Tela 1 — Importação de dados (`#/importacao`, `views/1_importacao.py`)

**Não exige base.** Menu: Dados › "Importação de dados" (ícone upload_file).

## Estrutura

### 1. Hero
- Rótulo: **"Módulo 01 · Dados"** · Título: **"Importação de dados"**
- Subtítulo: "Traga o histórico de vendas ou demanda. O sistema mapeia as colunas, audita a qualidade da base e aplica o tratamento padrão antes de liberar as análises."
- Chips: "CSV · XLSX · XLS" · "Validação automática" · "Tratamento de nulos e negativos"

### 2. Origem dos dados (2 cartões, colunas 3:2, mesma altura)
**Cartão "Carregar base própria"** (ícone upload_file)
- Seletor de arquivo: rótulo **"Arraste o arquivo ou clique para selecionar"**; aceita `.csv`, `.xlsx`, `.xls`; dica: "Colunas mínimas: sku, data e quantidade_vendida (nomes diferentes podem ser mapeados abaixo)."

**Cartão "Base de demonstração"** (ícone science)
- Texto: "5 produtos com perfis estatísticos distintos, 4 anos de histórico diário — ideal para conhecer todas as funcionalidades."
- Botão primário **"Usar demonstração"** (bolt) · botão **"Modelo CSV"** (download) → baixa `modelo_importacao.csv`.

### 3. Estados de origem
- Arquivo enviado → usa o arquivo (e desliga a demo). Leitura por extensão: `csv` → CSV; `xls`/`xlsx` → planilha; outra → "Formato não suportado.". Colunas normalizadas (minúsculas, espaços → `_`).
  - Falha de leitura → erro **"Não foi possível ler o arquivo: {mensagem}"** (ícone error) e a tela para.
  - Origem: **"Arquivo · {nome}"**.
- Sem arquivo e demo clicada → carrega o CSV da demo (cru); origem **"Base de demonstração"**.
- Nenhum dos dois → expansor **"Formato esperado do arquivo"** (help): "Uma linha por **produto × data**. Colunas extras (ex.: `categoria`, `preco_unitario`) são preservadas." + tabela com o modelo CSV (3 linhas). A tela para.

### 4. Mapeamento de colunas (só se faltar `sku`, `data` ou `quantidade_vendida`)
- Seção **"Mapeamento de colunas"** — "Não encontramos alguns nomes padrão. Indique qual coluna do arquivo corresponde a cada campo."
- Um seletor por campo faltante, na ordem do esquema, com rótulos: `sku` → **"Produto / SKU"** · `data` → **"Data"** · `quantidade_vendida` → **"Quantidade vendida"**; opções = colunas do arquivo que não são campos padrão; placeholder **"Selecione a coluna…"**; nada selecionado por padrão.
- Enquanto houver campo sem coluna: aviso **"Complete o mapeamento para continuar."** (info) e a tela para.
- Completo → renomeia as colunas escolhidas para os nomes padrão.

### 5. Auditoria de qualidade
Validação (`validateData`): colunas ausentes (já resolvidas), **valores nulos** (`quantidade_vendida` vazia), **negativos** (só se a coluna é numérica), **duplicadas** (`sku` × `data` repetidos, contando a 2ª ocorrência em diante), **datas inválidas** (a coluna inteira não converte).
- Datas inválidas → erro **"A coluna de datas não pôde ser convertida. Verifique o formato (ex.: AAAA-MM-DD)."** e a tela para.
- Tratamento padrão (`applyDefaultTreatment`): converte `data`; remove linhas com `sku` ou `data` vazios/inválidos; `quantidade_vendida` vazia → 0; negativos → 0; ordena por `sku` e `data`. Duplicatas **mantidas**.
- Índice de qualidade: `problemas = nulos + negativos + duplicadas`; `score = max(0, 100 − problemas / max(linhas brutas, 1) × 100 × 10)`.

Seção **"Auditoria de qualidade"** — subtítulo `Origem: {origem}`. Quatro métricas:
| Rótulo | Valor | Detalhe |
|---|---|---|
| Registros | linhas brutas | — |
| SKUs | nº | — |
| Período | `MM/AA – MM/AA` | dica `DD/MM/AAAA a DD/MM/AAAA` |
| Índice de qualidade | `{score:.0f}/100` | delta `"{n} ocorrência(s)"` (vermelho/inverso) ou `"Sem ocorrências"` (sem seta) |

Cartão com 3 verificações (rótulo caixa alta · número grande · badge):
| Verificação | Badge se 0 | Badge se > 0 |
|---|---|---|
| Valores nulos | "OK" (verde) | "Tratado: substituídos por 0" (âmbar) |
| Quantidades negativas | "OK" | "Tratado: ajustadas para 0" |
| Duplicidades (SKU × data) | "OK" | "Tratado: mantidas para revisão" |

### 6. Pré-visualização
Seção **"Pré-visualização da base tratada"** — "Ordenada por SKU e data. Use a busca e a ordenação das colunas para inspecionar."
Abas:
- **Registros** (table): tabela com altura 380 px — colunas "SKU", "Data" (`DD/MM/AAAA`), "Quantidade" (inteiro localizado). Ordenável por coluna; busca.
- **Resumo por SKU** (inventory_2): colunas "SKU", "Registros", "Volume" (barra 0…máx), "Média por registro" (1 casa), "Início", "Fim" (`DD/MM/AAAA`).

### 7. Confirmação
Cartão: "**Tudo certo?** Confirme para disponibilizar a base em todos os módulos de análise e previsão." + botão primário **"Confirmar e salvar base"** (check_circle): ativa a base tratada (`origem` = origem), desliga a demo, mostra o aviso **"Base salva! Abrindo a análise histórica…"** (celebration) e navega para Análise histórica.

## Particularidades
- A base só vira ativa após **"Confirmar e salvar base"**; "Usar demonstração" apenas pré-visualiza (a barra lateral/outros módulos usam "Carregar demonstração" para ativar direto).
- Colunas extras do arquivo existem na leitura, mas a base ativa só carrega as 3 colunas padrão na migração (decisão: o domínio é `SaleRecord`).
- Fim de linha/encoding: UTF-8; separador vírgula (PapaParse com detecção automática de delimitador — decisão de migração, o original só aceitava vírgula).

## Dados usados
`parse` · `validateData` · `applyDefaultTreatment` · `datasetSummary` · `qualityScore` · `templateCsv`.
