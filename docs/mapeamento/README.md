# Mapeamento do sistema atual (Streamlit) → especificação da migração

Inventário completo do **Demanda+** como ele é hoje (`legacy/streamlit/`): casca da aplicação, telas, botões, textos, fórmulas e comportamentos. É a base das specs em [docs/specs](../specs) e do plano em [docs/plans/migracao-react.md](../plans/migracao-react.md).

**Regra de uso:** textos entre aspas são **literais** — a versão React deve exibi-los iguais (salvo decisão registrada no ADR 0001). Onde o original tem um comportamento estranho, ele aparece como **⚠ Particularidade**; a coluna "Decisão" diz se a migração preserva (**P**), corrige (**C**) ou adia (**B** = backlog).

## Telas

| # | Rota (hash) | Título no menu | Seção | Ícone | Arquivo original | Mapeamento |
|---|---|---|---|---|---|---|
| 0 | `#/` | Visão geral | Início | home | `views/0_inicio.py` | [00-visao-geral.md](00-visao-geral.md) |
| 1 | `#/importacao` | Importação de dados | Dados | upload_file | `views/1_importacao.py` | [01-importacao.md](01-importacao.md) |
| 2 | `#/analise` | Análise histórica | Dados | query_stats | `views/2_analise_historica.py` | [02-analise-historica.md](02-analise-historica.md) |
| 3 | `#/previsao` | Previsão de demanda | Planejamento | trending_up | `views/3_previsao_demanda.py` | [03-previsao-demanda.md](03-previsao-demanda.md) |
| 4 | `#/comparacao` | Comparação de modelos | Planejamento | leaderboard | `views/4_comparacao_modelos.py` | [04-comparacao-modelos.md](04-comparacao-modelos.md) |
| 6 | `#/cenarios` | Cenários e CPFR | Planejamento | tune | `views/6_cenarios_cpfr.py` | [06-cenarios-cpfr.md](06-cenarios-cpfr.md) |
| 5 | `#/dashboard` | Dashboard gerencial | Gestão | monitoring | `views/5_dashboard_gerencial.py` | [05-dashboard-gerencial.md](05-dashboard-gerencial.md) |
| 7 | `#/relatorios` | Relatórios e laudos | Gestão | description | `views/7_relatorios.py` | [07-relatorios.md](07-relatorios.md) |

A numeração dos arquivos segue a do original (a ordem do menu coloca Cenários antes do Dashboard).

## 1. Casca da aplicação (`app.py`)

### 1.1 Metadados
- Título da aba do navegador: **"Demanda+ · Gestão de Demanda"**; ícone `assets/icon.svg`; layout largo; barra lateral aberta.
- Menu "Sobre": **"Demanda+ — sistema de previsão e gestão de demanda (S&OP / CPFR)."**
- Logo na barra lateral: `assets/logo.svg` ("Demanda+" com o "+" em verde-água e a legenda "PLANEJAMENTO · S&OP"); recolhida, mostra `icon.svg`.

### 1.2 Navegação (barra lateral escura)
Quatro seções, nesta ordem — **Início** (Visão geral, padrão) · **Dados** (Importação de dados, Análise histórica) · **Planejamento** (Previsão de demanda, Comparação de modelos, Cenários e CPFR) · **Gestão** (Dashboard gerencial, Relatórios e laudos). Cabeçalho de seção em caixa alta, 0,68 rem, espaçamento 0,12 em, opacidade 55%. Item ativo: fundo em gradiente índigo.

### 1.3 Cartão de status da base (barra lateral)
**Com base carregada:**
- Rótulo "Base ativa" (ponto verde-água) · valor: a origem (`"Base de demonstração"` ou `"Arquivo · <nome>"`)
- Linhas: **SKUs** `n` · **Registros** `n` (milhar com ponto) · **Período** `MM/AAAA – MM/AAAA`
- Botão **"Trocar base"** (ícone swap_horiz, largura total): limpa a base e navega para Importação.

**Sem base:** rótulo "Sem base ativa" (ponto âmbar) · "Carregue dados para começar" · botão primário **"Carregar demonstração"** (ícone bolt): carrega a demo, exibe o aviso **"Base de demonstração carregada"** (check_circle) e recarrega.

Rodapé: **"Demanda+ · v2.0 — Previsão estatística, backtesting e colaboração CPFR."**

### 1.4 Guarda de dados (`ui.require_data`)
Telas 2, 3, 4, 5, 6 e 7 exigem base. Sem base mostram o cartão: título **"Nenhuma base carregada ainda"**, texto "Este módulo precisa de um histórico de demanda. Importe sua planilha (CSV/Excel) ou explore o sistema agora com a base de demonstração — 5 produtos com perfis estável, crescente, sazonal, irregular e intermitente.", botão primário **"Usar dados de demonstração"** (carrega e recarrega) e link **"Importar minha base"** (→ Importação); a execução da tela para ali.

### 1.5 Estado
Só em memória da sessão (`df_dados`, `origem`, `import_demo`, `rel_gerado`, widgets). **Recarregar a página perde tudo.**
**Decisão (C):** a migração persiste a base em `localStorage` (SPEC-PER-*) — necessário para testar no celular sem recarregar; é a única mudança de comportamento do estado.

## 2. Componentes visuais compartilhados (`src/ui.py`)

| Componente | Descrição | Equivalente React |
|---|---|---|
| `hero(title, subtitle, eyebrow, chips)` | Bloco de topo: gradiente índigo (#1E1B4B → #312E81 → #4338CA) com brilhos verde-água/rosa e grade, cantos 22 px, rótulo (ponto verde-água + caixa alta), título 2 rem/800, subtítulo ≤ 780 px, chips translúcidos | `<Hero>` |
| `section(title, subtitle)` | Título 1,08 rem/750 com barra vertical em gradiente índigo→verde-água; subtítulo cinza 0,86 rem | `<Section>` |
| `badge(text, tone)` | Pílula com ponto; tons: indigo, teal, green, amber, red, slate, pink | `<Badge tone>` |
| `callout(text, tone, icon)` | Faixa com ícone/emoji e texto (aceita `<b>`), borda do tom | `<Callout>` |
| `step(n, title, desc)` | Número em quadrado índigo + título + descrição | `<Step>` |
| `winner(label, value, meta)` | Cartão verde-água em gradiente com rótulo, valor 1,7 rem e meta | `<WinnerCard>` |
| `chart(fig, height)` | Plotly com modelo próprio | `<ChartFrame>` + Recharts |
| `st.metric` | Cartão branco, borda #E5E7EF, raio 16, rótulo caixa alta 0,72 rem, valor 1,6 rem/750, delta; altura igualada na linha; elevação no hover | `<Metric>` |
| Contêiner com borda | Cartão branco com sombra | `<Card>` |
| Abas / pílulas / controle segmentado / slider / seletor / multiseleção / data / uploader / editor de dados / expansor / status / progresso / toast | Widgets do Streamlit usados pelas telas | `ui/*` (ver plano, etapa 4) |

### 2.1 Tokens de design
- Primária **#4F46E5** · suave #EEF2FF · acento **#14B8A6** · tinta #0F172A · apagado #64748B · borda #E5E7EF · grade #EEF1F6 · fundo #F6F7FB · fundo secundário #EEF0F7 · texto #1E293B
- Paleta categórica (ordem): `#4F46E5, #14B8A6, #F59E0B, #EC4899, #0EA5E9, #8B5CF6, #EF4444, #22C55E`
- Barra lateral: fundo #0F172A, secundário #1E293B, texto #E2E8F0, destaque #818CF8
- Fonte **Inter** (400–800); tamanho base 15 px; raio base 0,75 rem; botão 0,65 rem
- Tons dos badges (fundo / texto): indigo #EEF2FF/#4338CA · teal #E6FAF7/#0F766E · green #ECFDF3/#15803D · amber #FFF7E6/#B45309 · red #FEF2F2/#B91C1C · slate #F1F5F9/#334155 · pink #FDF2F8/#BE185D
- Tom por perfil: Estável→green · Crescente→indigo · Decrescente→red · Irregular→amber · Intermitente→pink · Sazonal/Variável→teal · Sem Dados→slate
- Gráficos: fundo transparente; eixo X sem grade; eixo Y com grade #EEF1F6 e milhar; legenda horizontal no topo à esquerda; dica ao passar o mouse unificada em X; barras com espaçamento 0,28 e cantos arredondados; separadores decimais `,` e milhar `.`
- Conteúdo: largura máx. 1360 px; topo 3,6 rem; base 4 rem.

### 2.2 Formatação pt-BR (`fmt_*`)
| Função | Regra | Exemplos |
|---|---|---|
| `fmt_int(x)` | 0 casas, milhar com `.`; inválido → `—` | 1234567 → `1.234.567` |
| `fmt_num(x, dec=1)` | `dec` casas, milhar `.`, decimal `,`; inválido → `—` | 1234.5 → `1.234,5` |
| `fmt_pct(x, dec=1, signed=False)` | `fmt_num` + `%`; NaN/inválido → `—`; `signed` põe `+` nos positivos | 12.34 (signed) → `+12,3%` |
| `fmt_date(d)` | `DD/MM/AAAA` | `09/11/2026` |

## 3. Dados

### 3.1 Esquema
Uma linha por **produto × data**; colunas obrigatórias `sku`, `data`, `quantidade_vendida`. Colunas extras são preservadas na leitura (mas não usadas pelas análises). Nomes são normalizados na leitura: minúsculas e espaços → `_`.

### 3.2 Base de demonstração (`data/demo_dataset.csv`)
7.280 linhas, 5 SKUs × 1.456 dias (2023-01-02 a 2026-12-27), colunas `sku,data,quantidade_vendida`. SKUs: **Agua Mineral 500ml, Camiseta Promocional, Placa Mae Servidor, Protetor Solar FPS50, Smartphone TechX**. Sem nulos nem negativos. Vira ativo `"Base de demonstração"`. (`generate_demo_data.py` gera um conjunto *diferente* — semanal, 5 SKUs `SKU_001…005` com erros propositais — e **não** é usado pelo app; vai só para `legacy/`.)

### 3.3 Modelo CSV para download (`template_csv`)
```csv
sku,data,quantidade_vendida
PROD_A,2025-01-01,120
PROD_A,2025-01-02,98
PROD_B,2025-01-01,40
```
Arquivo `modelo_importacao.csv`, UTF-8.

## 4. Constantes de domínio (`services.py`)
| Constante | D (Diária) | W (Semanal) | ME (Mensal) |
|---|---|---|---|
| Rótulo (`FREQS`) | "Diária" | "Semanal" | "Mensal" |
| Período sazonal `SEASON` | 7 | 52 | 12 |
| Unidade plural `UNIT` | dias | semanas | meses |
| Unidade singular `UNIT_SING` | dia | semana | mês |
| Horizonte padrão `DEFAULT_H` | 30 | 12 | 6 |
| Horizonte máximo `MAX_H` | 180 | 52 | 24 |

`MODEL_INFO` (textos literais):
- **Naive** — "Repete o último valor observado. Linha de base para comparar os demais."
- **Média Móvel** — "Média das últimas 3 observações. Suaviza ruído; ideal para demanda estável."
- **SES** — "Suavização exponencial simples: pondera mais os dados recentes."
- **Holt** — "Suavização com tendência — capta crescimento ou queda consistente."
- **Holt-Winters** — "Tendência + sazonalidade — capta ciclos (ex.: verão, fim de ano)."
- **Regressão** — "Reta de tendência ajustada sobre todo o histórico."
- **Croston** — "Específico para demanda intermitente (muitos períodos zerados)."

## 5. Particularidades do original (decisões de paridade)

| # | Particularidade | Decisão |
|---|---|---|
| P1 | **Média Móvel** prevê a média das observações `n-4…n-2` (o valor ajustado é deslocado em 1, então a última observação fica de fora), embora o texto diga "últimas 3". O mesmo vale para o CPFR (janela 4 → `n-5…n-2`). | **P** — paridade numérica com o original; item de backlog (BKL-02) para decidir a correção |
| P2 | `pandas.std()` usa ddof=1 (amostral) em CV/desvios dos indicadores; `np.nanstd` dos resíduos usa ddof=0 | **P** — cada ponto usa o mesmo ddof do original (specs EDA e FCS) |
| P3 | Perfil de demanda sempre sobre a série **semanal completa**, mesmo com outra granularidade/janela na tela | **P** |
| P4 | Laudo calcula o backtest com `h_bt = min(max(int(n·0.2),3),12)` sem o teto `n-4` e o piso de 6 períodos que `best_model` aplica; pode falhar com histórico curto | **C** — o laudo usa `bestModel` (mesma regra da Previsão e do portfólio) |
| P5 | `acurácia` no backtest da Previsão vem do `best_model` (horizonte próprio), não do horizonte escolhido no controle | **P** |
| P6 | Intervalos de confiança: `fc ± z·σ·min(√passo, 3)` (z = 1,2816 para 80%; 1,96 para 95%); piso em 0 no limite inferior | **P** |
| P7 | CPFR: divergência positiva (parceiro acima do sistema) = "Risco de ruptura"; negativa = "Risco de excesso" | **P** |
| P8 | Status "Alinhado" usa `|div| < tolerância`; "crítico" usa `|div| ≥ tolerância` | **P** |
| P9 | Semana termina no **domingo** (`W` do pandas), e o rótulo do período é o domingo; mês é rotulado no último dia | **P** |
| P10 | Importação: duplicatas SKU × data são **sinalizadas mas mantidas** | **P** |
| P11 | Estatística do CPFR com histórico < 4 semanas quebra o app (`None`) | **C** — mensagem "Histórico insuficiente" |
| P12 | Estado perdido ao recarregar | **C** — persistência (SPEC-PER) |
| P13 | `statsmodels` otimiza α/β/γ por L-BFGS; o TS usa otimizador próprio com estados iniciais por mínimos quadrados — resultados próximos, não idênticos | **P** com tolerância (SPEC-FCS-10) |
| P14 | Plotly traz barra de ferramentas (zoom/pan/exportar PNG, sem lasso/seleção) e *rangeslider* na série temporal | **B** — a migração entrega dica, legenda clicável e, na série temporal, o seletor de janela da própria tela; zoom/exportar PNG vão para o backlog |
