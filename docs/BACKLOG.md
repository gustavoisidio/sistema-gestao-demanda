# Backlog técnico

Itens fora do escopo da migração ou adiados. **Esforço:** P (horas) · M (1–2 dias) · G (vários dias). **Risco:** B/M/A. Itens que mudam regra de negócio começam por uma spec em [docs/specs](specs) e, se forem decisão de produto, por um [ADR](adr).

## Prioridade alta — próximo a pegar

| ID | Item | Por quê | Esforço | Risco |
|---|---|---|---|---|
| BKL-01 | **Migração Streamlit → React** (plano em [migracao-react.md](plans/migracao-react.md)) | Publicar no Railway com a stack do app de gastos | G | M |
| BKL-02 | **Decidir a Média Móvel (P1):** a previsão exclui a última observação (usa `n-4…n-2`), embora o texto diga "últimas 3". Corrigir para `n-3…n-1` melhora a aderência ao texto, mas muda os números de Média Móvel, do CPFR e do ranking | Fidelidade ao rótulo × fidelidade ao original; decisão do dono do produto | P | M |

## Potencial — fazer quando houver gatilho

| ID | Item | Gatilho | Esforço | Risco |
|---|---|---|---|---|
| BKL-03 | **Deploy no Railway** (Dockerfile + nginx; domínio) | após o teste em aparelho externo e a aprovação | P | B |
| BKL-04 | **Zoom e exportar PNG nos gráficos** (a barra do Plotly não existe no Recharts) | pedido de usuários | M | B |
| BKL-05 | **Web Worker para backtest/portfólio** | travamento medido > 300 ms na etapa 9.2 | M | M |
| BKL-06 | **Tema escuro** | pedido de produto (o original é só claro; o app de gastos tem escuro) | M | B |
| BKL-07 | **Persistir edições do CPFR e laudos gerados** (hoje só na sessão, como o original) | uso real do CPFR com parceiros | M | M |
| BKL-08 | **Backup/importação de configurações** (base + escolhas) em arquivo | troca de aparelho | M | B |
| BKL-09 | **Mais de uma base salva** (histórico de importações) | uso por vários clientes | M | M |
| BKL-10 | **Colunas extras preservadas** (`categoria`, `preco_unitario`) para filtros e valor financeiro | pedido de produto | M | M |
| BKL-11 | **Modelos adicionais** (ETS automático, ARIMA, Prophet-like) e intervalo por simulação | pedido de produto | G | M |
| BKL-12 | **Autenticação e backend de dados** (Firebase, como o app de gastos) | uso multiusuário | G | A |
| BKL-13 | **PWA offline** completo (service worker com cache do app) | uso em campo sem rede | M | B |

## Ideias (sem compromisso)
Nada aqui entra no desenvolvimento sem decisão do usuário.

## Concluído nesta rodada
_(preenchido ao fim de cada macro-etapa)_
