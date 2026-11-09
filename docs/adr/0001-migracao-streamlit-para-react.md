# ADR 0001 — Migração do Demanda+ de Streamlit para React/Vite/TypeScript

**Status:** aceito · 2026-11-09

## Contexto
O Demanda+ é uma aplicação Streamlit (Python: pandas, statsmodels, scikit-learn, Plotly). O objetivo é publicá-la no Railway com a mesma stack e o mesmo processo do app de gastos (React + Vite + TypeScript + Tailwind + Recharts + Vitest, Dockerfile + nginx), migrando **a aplicação inteira** — telas, funcionalidades, textos e cálculos.

## Decisões
1. **Sem backend.** Todo o cálculo estatístico roda no navegador em TypeScript. Os volumes (milhares de linhas, séries de centenas de pontos) cabem com folga; a lógica fica em `services/` puros, portável para worker/backend se preciso.
2. **Paridade numérica por dados de referência.** O Python original gera arquivos `__golden__` (statsmodels 0.14.6, pandas 2.3.3) que os testes comparam: determinísticos (Naive, Média Móvel, Regressão, Croston) a 1e-9; SES a 0,01%; Holt e Holt-Winters por **SSE ≤ referência** e previsão total dentro de 5%.
3. **Holt/Holt-Winters sem biblioteca externa.** Otimização com Nelder–Mead limitado em `[0,1]` nos parâmetros de suavização; estados iniciais por mínimos quadrados lineares *condicionados* aos parâmetros (o modelo aditivo é linear nos estados). Com HW, a restrição `Σs0 = 0` elimina a ambiguidade nível × sazonalidade sem mudar o ajuste. Resultado: busca em 3 dimensões em vez de 56.
4. **Paridade de particularidades:** a Média Móvel exclui a última observação do cálculo da previsão (P1) — preservada e registrada em BKL-02 para decisão do dono do produto; ddof, ordem de classificação, intervalos de confiança e rótulos de período (semana termina no domingo) idênticos ao original.
5. **Correções deliberadas** (únicas mudanças de comportamento): (a) laudo usa a mesma regra de `bestModel` da Previsão (P4); (b) datas inválidas são descartadas em vez de bloquear a importação (SPEC-DAT-08) — o README original já descrevia assim; (c) data aceita como dia/mês/ano (SPEC-DAT-07); (d) histograma com 30 classes exatas (SPEC-EDA-11); (e) CPFR com histórico curto mostra mensagem em vez de quebrar (P11); (f) base ativa persiste no `localStorage` (SPEC-PER).
6. **Planilhas:** SheetJS (`xlsx`, versão oficial do CDN do fabricante, carregada sob demanda) lê/escreve `.xlsx` e `.xls`, mantendo o suporte do original.
7. **Roteamento por hash** sem biblioteca (oito telas planas); permite recarregar e compartilhar a rota.
8. **Mobile first na migração:** o original não era responsivo; o app será testado em celular, então a casca (gaveta de menu), tabelas e gráficos têm requisito explícito (SPEC-SHL-06; plano 9.1).
9. **Código original preservado** em `legacy/streamlit/` até a paridade ser aceita pelo dono do produto.

## Consequências / dívida conhecida
- Holt/Holt-Winters não são idênticos bit a bit ao statsmodels (otimizadores distintos). Mitigação: SSE medido ≤ referência e tolerância documentada.
- Sem barra de ferramentas do Plotly (zoom, exportar PNG): BKL-04.
- Cálculos pesados no thread principal (backtest do portfólio): memoizados; worker em BKL-05 se a medição de M9.2 acusar travamento.
