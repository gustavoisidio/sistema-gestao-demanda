# Changelog

---

## 1.0.0 — 2026-11-09 — Migração para React

### Alterado
- **Migração do Demanda+ de Streamlit (Python) para React + Vite + TypeScript + Tailwind + Recharts**, com todos os cálculos estatísticos no navegador. O código original fica em `legacy/streamlit/` como referência. Plano: `docs/plans/migracao-react.md`; decisões: `docs/adr/0001-migracao-streamlit-para-react.md`.
- **Oito telas migradas** com os textos, fórmulas e comportamentos do original (`docs/mapeamento/`): Visão geral, Importação de dados, Análise histórica, Previsão de demanda, Comparação de modelos, Cenários e CPFR, Dashboard gerencial e Relatórios e laudos.
- **Motor de previsão em TypeScript** (Naive, Média Móvel, SES, Holt, Holt-Winters, Regressão e Croston), validado contra o Python original: modelos determinísticos e SES com diferença ≤ 1e-9; Holt e Holt-Winters com SSE ≤ statsmodels (previsão total até 1,1% e 11,7% de diferença nos piores casos da base de demonstração, `SPEC-FCS-10`).
- **Interface responsiva** (menu em gaveta no celular), acessível (axe WCAG 2 A/AA sem violações sérias) e sem rolagem horizontal de 360 a 1280 px.

### Adicionado
- A **base ativa é salva no aparelho** e sobrevive ao recarregar a página (`SPEC-PER-01…05`); o original perdia tudo ao recarregar.
- Importação aceita datas `DD/MM/AAAA`, números com vírgula decimal e CSV com `;`; datas inválidas são descartadas e informadas em vez de bloquear a importação (`SPEC-DAT-06…08`).
- `npm run serve:lan`: build de produção servido por IP na rede local, para testar em outro aparelho.
- Verificações: `npm run verify` (versão, specs, tipos, lint, testes), `npm run check:texts` (textos do mapeamento presentes na interface) e `npm run e2e` (Playwright: navegação, importação, acessibilidade, desempenho).

### Preservado do original (decisão do dono do produto pendente)
- A **Média Móvel** prevê a média de `n-4…n-2` (a última observação fica de fora), como no código original; ver `BKL-02`.
