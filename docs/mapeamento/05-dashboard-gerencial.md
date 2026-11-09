# Tela 5 — Dashboard gerencial (`#/dashboard`, `views/5_dashboard_gerencial.py`)

**Exige base.** Menu: Gestão › "Dashboard gerencial" (ícone monitoring).

## Estrutura

### 1. Hero
Rótulo **"Módulo 05 · Gestão"** · Título **"Dashboard gerencial"** · Subtítulo: "Visão executiva do portfólio: volume, ritmo recente, participação por produto e evolução temporal."

### 2. Filtros (cartão, colunas 3:2)
| Controle | Rótulo | Opções / padrão |
|---|---|---|
| Multisseleção | **"Produtos"** | todos os SKUs (padrão: todos); placeholder **"Todos os produtos"**; vazio = todos |
| Intervalo de datas | **"Período"** | de `min(data)` a `max(data)` da base (inclusive); formato `DD/MM/AAAA`; padrão = tudo. Se o usuário escolhe só a 1ª data, usa o intervalo completo |

`base` = registros dos SKUs escolhidos com `ini ≤ data ≤ fim`. Se vazio: info **"Nenhum dado para os filtros selecionados."** (filter_alt_off) e a tela para.

### 3. KPIs (5 métricas)
Definições (sobre `base`; `ultimo` = maior data em `base`):
- `r30` = soma de `(ultimo − 30d, ultimo]`; `p30` = soma de `(ultimo − 60d, ultimo − 30d]`; `delta30 = (r30 − p30)/p30 × 100` (omitido se `p30` = 0)
- `ano` = soma de `(ultimo − 365d, ultimo]`; `ano_ant` = soma de `(ultimo − 730d, ultimo − 365d]`; `yoy = (ano − ano_ant)/ano_ant × 100` (omitido se 0)
- `por_sku` = soma por SKU, decrescente · `diario` = soma por data · `mensal` = soma por mês (rótulo = fim do mês), **só meses cujo fim ≤ último dia dos dados** (mês final incompleto omitido)

| Rótulo | Valor | Detalhe |
|---|---|---|
| Volume no período | `fmt_int(soma)` | mini área com `mensal` |
| Últimos 30 dias | `fmt_int(r30)` | delta `fmt_pct(delta30, signed)` + descrição "vs. 30 dias anteriores" |
| Últimos 12 meses | `fmt_int(ano)` | delta `fmt_pct(yoy, signed)` + "vs. 12 meses anteriores" |
| Média diária | `fmt_num(média de diario)` | mini linha com os últimos 60 dias |
| Produto campeão | nome do 1º de `por_sku` | delta "`{fmt_num(participação,0)}% do volume`" (neutro, sem seta) |

### 4. Distribuição (colunas 3:2, cartões)
- **"Volume por produto"** — barras horizontais (320 px), SKUs por volume decrescente de cima para baixo; cor de cada SKU = paleta pela **posição na lista completa de SKUs** (estável com filtros); rótulo `fmt_int` fora da barra; dica `{sku}: {n} un.`
- **"Participação no portfólio"** — rosca (320 px, furo 62%), fatias na ordem de `por_sku`, mesmas cores, borda branca 2 px, `%` dentro; texto central **`{fmt_int(total)}`** / "unidades"; legenda vertical à direita; dica `{sku}` / `{n} un. ({%})`.

### 5. Evolução temporal
Seção **"Evolução temporal"** — "Volume mensal por produto." Controle segmentado **"Visualização"**: **Empilhado** (padrão) · Linhas · Participação %.
- Dados: soma por (mês, SKU), meses com fim > último dia dos dados omitidos. Legenda: "Meses incompletos no fim do período são omitidos. Dados até {DD/MM/AAAA}."
- Empilhado: áreas empilhadas (linha de 1 px); Participação %: áreas normalizadas para 100% (eixo "% do volume"); Linhas: linhas com marcadores. Eixo Y "Volume mensal" (exceto participação). Cores por SKU como acima. 420 px; sem título de legenda.

### 6. Intensidade mensal por produto
Seção **"Intensidade mensal por produto"** — "Índice do mês em relação à média do próprio produto (100 = média)." Mapa de calor (300 px): linhas = SKUs, colunas = meses; `índice = valor / média do SKU × 100`; escala divergente centrada em 100: `#FDE68A` (baixo) → branco (100) → `#4F46E5` (alto); dica `{sku} · {mês/ano}` / `índice {n}`.

## Particularidades
- Os cortes de 30/365 dias são em dias corridos a partir da última data **da seleção**.
- Com SKUs diferentes terminando em datas diferentes, o "último" é o máximo da seleção.
- Mobile: KPIs em 2 colunas (o 5º ocupa a linha inteira); gráficos em coluna única.

## Dados usados
`dashboardKpis` · `volumeBySku` · `monthlyBySku` · `intensityIndex`.
