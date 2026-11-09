# Comportamento específico das telas

Cada requisito aponta para o arquivo de mapeamento da tela. Os textos são literais do mapeamento.

## Visão geral — [00](../mapeamento/00-visao-geral.md)

### SPEC-PAG-01 — Visão geral sem base
**Regra:** exibe o hero, o cartão "Comece em segundos" (botão "Explorar com dados de demonstração" ativa a demo; link "Importar minha base") e o "Fluxo de trabalho" com 6 cartões; não exibe KPIs nem a tabela.

### SPEC-PAG-02 — Visão geral com base
**Regra:** exibe os 4 KPIs (Volume histórico, Produtos (SKUs), Registros, Cobertura = `⌊dias/30⌋ meses`), a seção "Portfólio em um relance" com uma linha por SKU e o "Fluxo de trabalho".

## Importação — [01](../mapeamento/01-importacao.md)

### SPEC-PAG-03 — Fluxo de importação
**Regra:** enviar um CSV válido mostra auditoria, pré-visualização e o botão "Confirmar e salvar base"; confirmar ativa a base, exibe "Base salva! Abrindo a análise histórica…" e navega para `#/analise`. "Usar demonstração" apenas pré-visualiza.

### SPEC-PAG-04 — Mapeamento de colunas
**Regra:** arquivo com colunas fora do padrão mostra um seletor por campo faltante ("Produto / SKU", "Data", "Quantidade vendida") com "Selecione a coluna…"; enquanto incompleto exibe "Complete o mapeamento para continuar." e não mostra a auditoria.

### SPEC-PAG-05 — Auditoria
**Regra:** exibe Registros, SKUs, Período e Índice de qualidade (`{n}/100`, com "n ocorrência(s)" ou "Sem ocorrências") e as 3 verificações com os selos "OK" ou "Tratado: …"; datas inválidas descartadas aparecem em uma linha informativa (SPEC-DAT-08); todas inválidas → "A coluna de datas não pôde ser convertida. Verifique o formato (ex.: AAAA-MM-DD)."

### SPEC-PAG-06 — Erros de leitura
**Regra:** arquivo ilegível ou de formato não suportado mostra "Não foi possível ler o arquivo: {mensagem}" e nada mais.

## Análise histórica — [02](../mapeamento/02-analise-historica.md)

### SPEC-PAG-07 — Filtros e janela
**Regra:** SKU (padrão: o primeiro), granularidade (padrão Semanal) e janela (padrão: série inteira) filtram os KPIs e gráficos; trocar SKU ou granularidade reinicia a janela; o perfil (badge) não muda com a granularidade nem com a janela.

### SPEC-PAG-08 — KPIs e abas
**Regra:** exibe os 5 KPIs com os rótulos do mapeamento e as 4 abas (Série temporal, Sazonalidade, Distribuição, Comparar SKUs); Comparar SKUs começa com os 3 primeiros SKUs e "Normalizar (índice base 100)" ligado.

## Previsão — [03](../mapeamento/03-previsao-demanda.md)

### SPEC-PAG-09 — Controles da previsão
**Regra:** granularidade padrão Mensal; horizonte entre 1 e `MAX_H` com padrão `DEFAULT_H` e valor lembrado por granularidade; confiança 80% ou 95%; série com menos de 6 períodos mostra "Histórico insuficiente para previsões estatísticas (mínimo de 6 períodos nessa granularidade)."

### SPEC-PAG-10 — Modelo recomendado
**Regra:** as pílulas listam os modelos disponíveis; o recomendado pelo backtest aparece como "★ {modelo}", vem selecionado e mostra "Recomendado pelo backtesting."; trocar o modelo atualiza KPIs, gráfico e tabela.

### SPEC-PAG-11 — KPIs da previsão
**Regra:** "Demanda prevista", "Média por {unidade}", "Faixa {conf} (total)" e "Acurácia no backtest" seguem as fórmulas do mapeamento (incluindo `—` quando indefinidos).

### SPEC-PAG-12 — Exportação da previsão
**Regra:** "Exportar Excel" e "Exportar CSV" baixam arquivos com as colunas Período, Previsão, Limite inferior ({conf}) e Limite superior ({conf}) e os nomes de SPEC-EXP-03.

## Comparação — [04](../mapeamento/04-comparacao-modelos.md)

### SPEC-PAG-13 — Limites do teste
**Regra:** o slider vai de 1 a `max(1, min(MAX_H, n − 4))` com padrão `min(DEFAULT_H, max)`; `n ≤ h + 3` mostra "Histórico insuficiente: a base tem {n} períodos e o teste usa {h}. Reduza os períodos de teste."; backtest vazio mostra "Nenhum modelo conseguiu calcular o horizonte selecionado."

### SPEC-PAG-14 — Vencedor, ranking e tabela
**Regra:** mostra o cartão do vencedor ("🏆 {modelo}", WAPE, ganho sobre o Naive), MAE, Viés e o callout de tracking signal (âmbar se `|TS| > 4`, verde caso contrário), o ranking por WAPE, o gráfico do teste cego com as 3 melhores e a tabela completa com as 9 colunas.

## Cenários e CPFR — [06](../mapeamento/06-cenarios-cpfr.md)

### SPEC-PAG-15 — Simulação
**Regra:** controles e padrões do mapeamento (12 semanas, choque 0, promoções nas semanas 4 e 8, uplift 30, modelo base Média Móvel); reduzir as semanas descarta promoções além do horizonte; os 4 KPIs e o gráfico refletem `buildScenario`; "Exportar cenário (Excel)" baixa `cenario_{sku}.xlsx`.
**Status:** planejado

### SPEC-PAG-16 — CPFR
**Regra:** tabela editável (só "Plano do parceiro"), KPIs de consenso, gráfico agrupado, alertas por semana crítica (callout verde "Plano em consenso…" ou vermelho "{n} semana(s) com desvio crítico…") e exportação `cpfr_{sku}.xlsx`; histórico insuficiente mostra "Histórico insuficiente para o plano de consenso."
**Status:** planejado

## Dashboard — [05](../mapeamento/05-dashboard-gerencial.md)

### SPEC-PAG-17 — Filtros e KPIs
**Regra:** filtros "Produtos" (vazio = todos) e "Período"; sem dados filtrados mostra "Nenhum dado para os filtros selecionados."; os 5 KPIs seguem SPEC-DSH-02.
**Status:** planejado

### SPEC-PAG-18 — Gráficos do dashboard
**Regra:** "Volume por produto", "Participação no portfólio", "Evolução temporal" (Empilhado, Linhas, Participação %) e "Intensidade mensal por produto" com a legenda "Meses incompletos no fim do período são omitidos. Dados até {data}."
**Status:** planejado

## Relatórios — [07](../mapeamento/07-relatorios.md)

### SPEC-PAG-19 — Laudo por produto
**Regra:** antes de "Gerar laudo" mostra "Selecione o produto e clique em Gerar laudo."; depois mostra cartão do laudo, 5 KPIs, gráfico e 3 downloads; trocar o SKU volta ao estado inicial.
**Status:** planejado

### SPEC-PAG-20 — Visão do portfólio
**Regra:** tabela com SKU, Perfil, Modelo recomendado, Acurácia, Viés, Volume 52 sem. e tendência; barra de progresso durante o cálculo; "Exportar visão do portfólio (Excel)".
**Status:** planejado
