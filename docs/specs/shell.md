# Casca da aplicação

Implementação: `src/components/layout/*`, `src/components/App.tsx`, `src/hooks/useRoute.ts`, `src/store/DatasetProvider.tsx`. Mapeamento: [README §1](../mapeamento/README.md).

### SPEC-SHL-01 — Rotas por hash
**Regra:** as rotas são `#/` (Visão geral), `#/importacao`, `#/analise`, `#/previsao`, `#/comparacao`, `#/cenarios`, `#/dashboard`, `#/relatorios`; hash desconhecido ou vazio abre a Visão geral; voltar/avançar do navegador funciona; o título da aba é `Demanda+ · Gestão de Demanda`.

### SPEC-SHL-02 — Menu
**Regra:** o menu mostra as seções Início, Dados, Planejamento e Gestão com os itens na ordem do mapeamento (Cenários e CPFR antes do Dashboard); o item da rota atual tem `aria-current="page"`.

### SPEC-SHL-03 — Cartão de status da base
**Regra:** com base: "Base ativa", origem, SKUs, Registros (milhar com ponto) e Período `MM/AAAA – MM/AAAA` e o botão "Trocar base"; sem base: "Sem base ativa", "Carregue dados para começar" e o botão "Carregar demonstração". Rodapé "Demanda+ · v2.0 — Previsão estatística, backtesting e colaboração CPFR."

### SPEC-SHL-04 — Carregar demonstração e trocar base
**Regra:** "Carregar demonstração" ativa a demo e mostra o aviso "Base de demonstração carregada"; "Trocar base" limpa a base e navega para `#/importacao`.

### SPEC-SHL-05 — Guarda de dados
**Regra:** as rotas Análise, Previsão, Comparação, Cenários, Dashboard e Relatórios sem base mostram "Nenhuma base carregada ainda" com "Usar dados de demonstração" e "Importar minha base" e **não** renderizam o conteúdo da tela.

### SPEC-SHL-06 — Navegação em telas estreitas
**Regra:** abaixo de 1024 px o menu lateral vira gaveta aberta por um botão de menu no topo (com alvo ≥ 44 px) e fecha ao escolher um item, ao tocar fora ou com Esc; a página não rola na horizontal em 360 px de largura.

### SPEC-SHL-07 — Avisos (toasts)
**Regra:** `useToast` exibe avisos temporários (≈ 3 s), empilháveis, com `role="status"`; usados para "Base de demonstração carregada" e "Base salva! Abrindo a análise histórica…".

### SPEC-SHL-08 — Componentes de interface
**Regra:** `Hero`, `Section`, `Badge`, `Callout`, `Metric`, `Card`, `WinnerCard`, `Tabs`, `Segmented`, `Pills`, `Slider`, `RangeSlider`, `Select`, `MultiSelect`, `DateRange`, `FileDrop`, `Expander`, `DataTable` e `ProgressBar` seguem os tokens do mapeamento (cores, raios, tipografia), são acessíveis por teclado, têm `data-testid` nos controles críticos e funcionam isolados (sem contexto global).

### SPEC-SHL-09 — Tema e identidade
**Regra:** fonte Inter, fundo `#F6F7FB`, cor primária `#4F46E5`, logo "Demanda+" na barra lateral, favicon e manifesto PWA com o ícone; `theme-color` `#0F172A`.
