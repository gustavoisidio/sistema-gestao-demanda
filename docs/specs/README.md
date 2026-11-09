# Specs

Spec-driven development: o comportamento esperado de cada módulo é escrito aqui **antes** do código e é a referência dos testes. Se código e spec divergem, um dos dois está errado — corrija conscientemente (e registre a decisão em [docs/adr](../adr)), nunca em silêncio.

A fonte do comportamento atual é o [mapeamento](../mapeamento/README.md) do sistema Streamlit; as specs transformam esse inventário em requisitos verificáveis da versão React.

## Como funciona

1. **Spec primeiro.** Nova funcionalidade ou mudança de regra começa por um requisito `SPEC-ÁREA-NN` (ou alteração de um existente) neste diretório, com critérios verificáveis.
2. **Teste cita a spec.** Cada requisito precisa de ao menos um teste cujo `describe`/`it` contenha o ID, por exemplo `describe('classifyBehavior (SPEC-EDA-03)', …)`.
3. **Rastreabilidade automática.** `npm run check:specs` falha se um requisito ativo não tem teste ou se um teste cita um ID que não existe. Roda dentro de `npm run verify`.
4. **IDs são estáveis.** Nunca reutilize um ID; ao aposentar um requisito, marque-o `(removido)` e mantenha o número.
5. **Mudou a regra de negócio?** Atualize a spec, o teste, o CHANGELOG e, se for decisão de produto, um ADR.

## Status

Todo requisito é **ativo** (implementado e com teste) por padrão. Um requisito de funcionalidade ainda não construída leva a linha `**Status:** planejado`; o `check:specs` só cobra teste dele quando a linha for removida (ao implementar a sub-etapa correspondente do [plano](../plans/migracao-react.md)). Um teste pode citar um ID planejado antes disso (desenvolvimento orientado a testes).

## Modelo de requisito

```md
### SPEC-ÁREA-NN — título curto
**Regra:** o que o sistema deve fazer, em uma ou duas frases verificáveis.
**Casos de borda:** lista (opcional).
**Origem:** arquivo do original / mapeamento (opcional).
**Status:** planejado   <!-- só enquanto não implementado -->
```

## Índice

| Arquivo | Área | Prefixo |
|---|---|---|
| [format.md](format.md) | Formatação pt-BR e datas | `FMT` |
| [data.md](data.md) | Leitura, mapeamento, validação e tratamento da base | `DAT` |
| [series.md](series.md) | Séries temporais: agregação, períodos parciais, futuro | `SER` |
| [eda.md](eda.md) | Análise exploratória e perfil de demanda | `EDA` |
| [forecasting.md](forecasting.md) | Os 7 modelos de previsão e intervalos | `FCS` |
| [evaluation.md](evaluation.md) | Métricas de erro e backtest | `EVL` |
| [scenarios-cpfr.md](scenarios-cpfr.md) | Cenários e plano de consenso | `SCN`, `CPF` |
| [reports.md](reports.md) | Laudo, portfólio e dashboard | `REL`, `DSH` |
| [export.md](export.md) | Exportações Excel/CSV/TXT | `EXP` |
| [persistence.md](persistence.md) | Persistência local da base | `PER` |
| [shell.md](shell.md) | Casca: rotas, menu, barra lateral, guarda de dados, responsividade | `SHL` |
| [pages.md](pages.md) | Comportamento específico de cada tela | `PAG` |

Itens ainda não especificados ou adiados: [BACKLOG](../BACKLOG.md).
