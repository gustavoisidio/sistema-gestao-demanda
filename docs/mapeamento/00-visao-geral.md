# Tela 0 — Visão geral (`#/`, `views/0_inicio.py`)

Tela padrão. **Não exige base.** Menu: Início › "Visão geral" (ícone home).

## Estrutura (de cima para baixo)

### 1. Hero
- Rótulo: **"Demanda+ · Central de planejamento"**
- Título: **"Planeje a demanda com precisão estatística"**
- Subtítulo: "Do histórico de vendas ao plano consensado: importe sua base, entenda o comportamento de cada produto, gere previsões com 7 modelos estatísticos, valide com backtesting e alinhe o plano com parceiros via CPFR."
- Chips: "7 modelos de previsão" · "Backtesting out-of-sample" · "Simulação de cenários" · "CPFR colaborativo" · "Laudos automáticos"

### 2a. Sem base — cartão "Comece em segundos" (2 colunas 3:2)
- Título: **"Comece em segundos"**
- Texto: "Carregue a base de demonstração com 5 produtos de perfis distintos (estável, crescente, sazonal, irregular e intermitente) ou importe sua própria planilha CSV/Excel com as colunas **sku**, **data** e **quantidade_vendida**."
- Botão primário **"Explorar com dados de demonstração"** (bolt): carrega a demo e recarrega a tela (agora no estado 2b).
- Link **"Importar minha base"** (upload_file) → Importação.

### 2b. Com base — KPIs e portfólio
Quatro métricas em linha:
| Rótulo | Valor | Dica (`help`) |
|---|---|---|
| Volume histórico | `fmt_int(soma de quantidade)` | "Soma de todas as unidades vendidas na base." |
| Produtos (SKUs) | nº de SKUs | — |
| Registros | `fmt_int(linhas)` | — |
| Cobertura | `{(fim − início).dias // 30} meses` | "`DD/MM/AAAA` a `DD/MM/AAAA`" |

Seção **"Portfólio em um relance"** — subtítulo "Perfil de demanda identificado automaticamente para cada SKU (base semanal)." Tabela (sem índice, largura total), uma linha por SKU em ordem alfabética:
| Coluna | Conteúdo |
|---|---|
| SKU | texto |
| Perfil | classe (`classifyBehavior` sobre a série semanal) |
| Volume total | inteiro localizado |
| Média semanal | 1 casa decimal |
| Variabilidade (CV) | barra de progresso, 0 a `max(1, maior CV)`, 2 casas |
| Crescimento (%) | com sinal, 1 casa, `%` |
| Últimas 52 semanas | mini gráfico de área com as últimas 52 semanas arredondadas |

### 3. Seção "Fluxo de trabalho"
Subtítulo: "Siga as etapas na ordem ou vá direto ao módulo que precisa." Seis cartões em 2 linhas × 3 colunas (mesma altura); cada um: número · título · descrição · link **"Abrir módulo"** com o ícone do módulo.
| # | Título | Descrição | Destino |
|---|---|---|---|
| 1 | Importação de dados | Carregue CSV/Excel, mapeie colunas e valide a qualidade da base. | Importação |
| 2 | Análise histórica | Indicadores, perfil de demanda, sazonalidade e distribuição. | Análise histórica |
| 3 | Previsão de demanda | Projeções com intervalos de confiança e exportação. | Previsão de demanda |
| 4 | Comparação de modelos | Teste cego (out-of-sample) para eleger o melhor método. | Comparação de modelos |
| 5 | Cenários e CPFR | Simule choques e promoções; alinhe o plano com parceiros. | Cenários e CPFR |
| 6 | Dashboard e laudos | Visão executiva do portfólio e relatórios prontos para S&OP. | Dashboard gerencial |

## Comportamentos
- Os KPIs e a tabela só existem com base; o fluxo de trabalho aparece sempre.
- Mobile (decisão de migração): cartões em 1 coluna; a tabela do portfólio rola na horizontal **dentro** do cartão (a página não rola).

## Dados usados
`datasetSummary` · `portfolioTable` (perfil semanal por SKU).
