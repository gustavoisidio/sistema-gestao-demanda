# Tela 6 — Cenários e CPFR (`#/cenarios`, `views/6_cenarios_cpfr.py`)

**Exige base.** Menu: Planejamento › "Cenários e CPFR" (ícone tune).

## Estrutura

### 1. Hero
Rótulo **"Módulos 08 e 09 · Planejamento"** · Título **"Cenários e CPFR"** · Subtítulo: "Simule choques de mercado e promoções sobre a previsão base e construa o plano de consenso com clientes e fornecedores (Collaborative Planning, Forecasting and Replenishment)."

### 2. Abas
**"Simulação de cenários"** (tune) · **"CPFR · gestão colaborativa"** (handshake). Cada aba guarda seus próprios controles.

---

## Aba 1 — Simulação de cenários

### Controles (cartão)
| Controle | Rótulo | Opções / padrão |
|---|---|---|
| Seletor | **"Produto"** | SKUs ordenados |
| Slider | **"Semanas no futuro"** | 4 … 52; padrão 12 |
| Pílulas | **"Previsão base"** | modelos de `runModels(sérieSemanal, h, 52)`; padrão **Média Móvel** (senão, o primeiro) |
| Slider | **"Choque de demanda global (%)"** | −50 … 100, passo 5, padrão 0; dica "Efeito macro em todo o horizonte (ex.: recessão −15%, nova praça +20%)." |
| Multisseleção | **"Semanas com promoção"** | `Semana 1 … Semana h`; padrão **Semana 4** e **Semana 8** (as que couberem em `h`); placeholder **"Selecione semanas…"**; ao diminuir `h`, descarta as semanas > `h` |
| Número | **"Uplift da promoção (%)"** | 0 … 300, passo 10, padrão 30 |

Série sempre **semanal** (`seriesFor(sku, 'W')`).

### Cálculo
- `base_fc` = previsão do modelo base (h semanas, piso 0)
- `cenário = base_fc × (1 + choque/100)`; depois, para cada semana de promoção `s` (índice `s−1`, se `< h`): `cenário[s−1] × (1 + uplift/100)`
- `datas = futureIndex(série, h, 'W')`

### KPIs (4)
| Rótulo | Valor | Detalhe |
|---|---|---|
| Volume base | `fmt_int(Σ base)` | — |
| Volume do cenário | `fmt_int(Σ cenário)` | delta `fmt_pct((vc − vb)/vb × 100, signed)` (0 se `vb` = 0) |
| Unidades incrementais | `fmt_int(vc − vb)` | delta neutro |
| Pico semanal | `fmt_int(max cenário)` | dica "Semana de `DD/MM/AAAA`" (data do pico) |

### Gráfico (430 px, eixo duplo)
- Barras **"Efeito do cenário"** (`cenário − base`; verde-água se ≥ 0, #F87171 se < 0; opacidade 35%; eixo secundário à direita **"Efeito (un.)"** a partir de 0; eixo secundário **visível só se algum |efeito| > 0,5**; dica `{+n} un.` / "Efeito")
- Linha tracejada cinza **"Base · {modelo}"**
- Linha índigo de 3 px **"Cenário simulado"** com marcadores (11 px verde-água nas semanas de promoção; 6 px índigo nas demais; borda branca)
- Eixo Y principal **"Quantidade semanal"** a partir de 0

### Detalhamento
Expansor **"Detalhamento semanal"** (table): colunas `Semana` ("Semana n"), `Data` (`DD/MM/AAAA`), `Base` (arredondada), `Cenário` (arredondada), `Promoção` (caixa de seleção somente leitura), `Variação (%)` (`(cenário − base)/base × 100` se base > 0, senão 0; com sinal, 1 casa). Botão **"Exportar cenário (Excel)"** (download) → `cenario_{sku}.xlsx`, planilha **"Cenario"**.

---

## Aba 2 — CPFR · gestão colaborativa

### Controles (cartão, 3 colunas iguais)
| Controle | Rótulo | Opções / padrão |
|---|---|---|
| Seletor | **"Produto para consenso"** | SKUs |
| Slider | **"Horizonte (semanas)"** | 4 … 16; padrão 8 |
| Slider | **"Tolerância de divergência (%)"** | 5 … 50, passo 5, padrão 20 |

### Previsão estatística do sistema
Série semanal do SKU; previsão = **Média Móvel com janela 4** (`simpleMovingAverage(série, h, 4)`, P1) repetida `h` vezes; datas = `futureIndex(série, h, 'W')`. Histórico < 4 semanas → mensagem "Histórico insuficiente para o plano de consenso." (P11).

### Tabela editável
Callout índigo ✍️: "Edite a coluna **Plano do parceiro** com as projeções recebidas do cliente/fornecedor. A análise de consenso é atualizada instantaneamente."
Colunas: `Semana` (data da semana, somente leitura, `DD/MM/AAAA`) · `Estatística (sistema)` (inteiro arredondado, somente leitura) · `Plano do parceiro` (inteiro ≥ 0, passo 1, editável; dica "Clique duas vezes para editar"; valor inicial = estatística). As edições são guardadas por (SKU, horizonte); **trocar a tolerância não as apaga**, trocar SKU ou horizonte reinicia a tabela.

### Cálculos
- `Divergência (%) = (parceiro − sistema)/sistema × 100` (0 se sistema ≤ 0)
- `Status`: `|div| < tolerância` → **"✅ Alinhado"**; senão `div > 0` → **"🔺 Risco de ruptura"**, `div < 0` → **"🔻 Risco de excesso"** (P7, P8)
- `críticos` = linhas com `|div| ≥ tolerância`; `aderência = (1 − críticos/linhas) × 100`

### Seção "Análise de consenso" — KPIs (4)
| Rótulo | Valor | Detalhe |
|---|---|---|
| Semanas alinhadas | `{linhas − críticos}/{linhas}` | delta neutro "`{fmt_num(aderência,0)}% de aderência`" |
| Plano do parceiro | `fmt_int(Σ parceiro)` | — |
| Estatística | `fmt_int(Σ sistema)` | — |
| Divergência total | `fmt_pct((Σparceiro − Σsistema)/max(Σsistema,1) × 100, signed)` | neutro |

### Gráfico e alertas (colunas 3:2)
- **Gráfico** (320 px, em cartão): barras agrupadas por semana — **"Estatística"** (#C7D2FE) e **"Parceiro"** (verde-água; **âmbar** nas semanas críticas); eixo "Quantidade".
- **Alertas**:
  - sem críticos → callout verde ✅ "**Plano em consenso.** Todas as semanas estão dentro da margem de ±{tol}%."
  - com críticos → callout vermelho ⚠️ "**{n} semana(s) com desvio crítico.** Recomenda-se reunião de alinhamento tático com o parceiro." e, para cada crítico, uma linha com a data (`DD/MM/AAAA`, em negrito) e um badge: `{fmt_pct(div, signed)} · ruptura` (âmbar, se `div > 0`) ou `{…} · excesso` (vermelho).

### Tabela de resultado e exportação
Tabela completa (`Semana`, `Estatística (sistema)`, `Plano do parceiro`, `Divergência (%)` com sinal e 1 casa, `Status`) e botão primário **"Exportar plano de consenso (Excel)"** → `cpfr_{sku}.xlsx`, planilha **"CPFR"**.

## Particularidades
- Edições do CPFR não persistem entre sessões no original; na migração são guardadas na sessão por (SKU, horizonte) e **não** vão para o `localStorage` (BACKLOG).
- Mobile: a tabela editável rola na horizontal dentro do cartão; inputs numéricos com teclado numérico (`inputMode="numeric"`).

## Dados usados
`seriesFor` · `runModels` · `applyLinear` · `applyPromotion` · `buildConsensus` · `toExcel`.
