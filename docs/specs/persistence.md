# Persistência local

Implementação: `src/infra/storage.service.ts`, `src/infra/storageKeys.ts`, `src/store/DatasetProvider.tsx`. O original guardava tudo só na sessão; a migração persiste a **base ativa** para sobreviver a recarregamentos (necessário em testes no celular).

### SPEC-PER-01 — Única porta para o armazenamento
**Regra:** só `storage.service` toca `localStorage`; `get<T>` e `set<T>` são tipados e com `try/catch`; leitura inválida/ausente devolve `null`; as chaves ficam em `storageKeys.ts` e seus valores são travados por teste.

### SPEC-PER-02 — Esquema versionado
**Regra:** o registro salvo tem `{ schemaVersion, origem, registros, salvoEm }`; versão desconhecida/corrompida é descartada sem lançar e a app abre sem base.

### SPEC-PER-03 — Salvar e restaurar a base
**Regra:** ao ativar uma base (importação confirmada, demo carregada), ela é gravada; ao abrir o app, a base gravada é restaurada e a barra lateral mostra "Base ativa". "Trocar base" remove o registro.

### SPEC-PER-04 — Falha de gravação explícita
**Regra:** se a gravação falhar (cota ~5 MB, modo privado), a base continua ativa **em memória** e a interface avisa: "Não foi possível salvar a base neste aparelho. Ela continua disponível até você fechar ou recarregar a página." — nunca falha em silêncio.

### SPEC-PER-05 — Estado de interface não persistente
**Regra:** filtros, seleção de modelo, edições do CPFR e laudo gerado vivem na sessão (como no original); só a base é persistida.
**Status:** planejado
