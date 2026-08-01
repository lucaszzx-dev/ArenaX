# Clubes reutilizáveis

Implementado em 29 de julho de 2026. Ciclo de evolução de clubes concluído em 1 de agosto de 2026.

## Clube e equipe não são a mesma coisa

O clube pertence ao organizador e pode ser reutilizado. Ele guarda nome, sigla,
escudo, cores oficiais, uniformes, comissão técnica, temporadas e elencos.

A equipe pertence a uma arena específica. Ao importar um clube, o ArenaX cria
uma cópia da identidade e do elenco naquele campeonato.

Essa cópia é intencional: alterar ou excluir o clube da biblioteca não modifica
equipes já inscritas, súmulas, escalações ou resultados históricos. A tabela
`teams.source_club_id` apenas rastreia a origem — não existe sincronização
automática.

## Regras atuais

- somente o proprietário pode consultar e alterar seus clubes;
- nomes de clubes não podem se repetir na mesma biblioteca;
- um clube só pode ser importado uma vez em cada arena;
- a importação existe apenas em arenas por equipes;
- capitão, camisa e posição são copiados junto com o elenco;
- a importação pode ser seletiva (lista de `memberIds`);
- depois da importação, clube e equipe evoluem de forma independente;
- ressincronizar uma equipe a partir do clube é sempre manual e exige
  visualização do diff antes de aplicar.

## Múltiplos elencos (decisão de modelagem)

Criamos uma tabela nova `club_squads` (e `club_squad_members`) em vez de um
campo de categoria em `club_members`. Motivos:

- um jogador pode pertencer a mais de um elenco (ex.: masculino e society);
- elencos têm atributos próprios: nome, categoria, modalidade, temporada e
  flag `is_primary`;
- manter `club_members` como catálogo único de jogadores evita duplicidade de
  cadastro e permite reuso entre elencos;
- `club_squad_members` é a ponte elenco-jogador com um papel (`role`), ex.:
  `PLAYER`, `CAPTAIN`.

Um elenco pode ser associado a uma temporada (`club_seasons.season_id`) e um
clube pode ter várias temporadas (`club_seasons`) com datas de início/fim.

## Comissão técnica, cores e uniformes

- `club_staff` guarda membros da comissão (técnico, auxiliar, preparador);
- `clubs` ganhou `primary_color`, `secondary_color`, `home_kit` e `away_kit`
  para identidade visual (todos opcionais, `#RRGGBB` para cores).

## Importação seletiva

`POST /api/clubs/:clubId/import/:championshipId` aceita um corpo opcional
`{ "memberIds": [...] }`. Sem `memberIds`, importa o elenco completo (mesmo
comportamento anterior). Os jogadores selecionados são copiados como novos
`team_members` — nunca referência viva.

## Ressincronização manual (diff + confirmação)

Fluxo em duas etapas:

1. `GET /api/clubs/:clubId/teams/:teamId/sync/preview` — calcula e devolve o
   diff sem alterar nada:
   - `toAdd`: jogadores do clube que não estão na equipe;
   - `toUpdate`: jogadores com dados diferentes (nome/camisa/posição/capitão);
   - `toRemove`: jogadores da equipe que não estão mais no clube;
   - `protectedMembers`: jogadores que NÃO podem ser removidos porque já
     possuem `match_events` ou aparecem em `match_lineups`.
2. `POST /api/clubs/:clubId/teams/:teamId/sync` — aplica o diff (adições e
   atualizações sempre; remoções apenas dos não protegidos).

A regra de proteção é obrigatória: `team_member` com eventos ou escalação
nunca é removido automaticamente. A confirmação é feita pelo próprio POST de
aplicação após o usuário revisar o preview.

## Exportação e importação de elenco

Formato JSON:

- `GET /api/clubs/:clubId/roster/export?format=json` — retorna
  `{ "club": {...}, "members": [...] }`;
- `POST /api/clubs/:clubId/roster/import` com
  `{ "format": "json", "content": "..." }` — aceita tanto a lista direta
  `[...]` quanto o objeto exportado `{ "members": [...] }`.

Formato CSV:

- `GET /api/clubs/:clubId/roster/export?format=csv` — retorna arquivo
  `nome,camisa,posicao,capitao`;
- `POST /api/clubs/:clubId/roster/import` com
  `{ "format": "csv", "content": "..." }` — exige a coluna `nome`; colunas
  `camisa`, `posicao` e `capitao` são opcionais (`sim/nao/true/false/1`).

Regras de importação:

- nome é obrigatório (2 a 80 caracteres);
- camisa deve ser inteiro entre 0 e 999 quando informada;
- jogadores com o mesmo nome (case-insensitive) são atualizados, não
  duplicados;
- linhas duplicadas dentro do mesmo arquivo são rejeitadas
  (`DUPLICATE_ROSTER_ROW`);
- um `squadId` opcional vincula os jogadores a um elenco específico.

## Auditoria

Toda ação relevante é registrada em `club_audit_logs` (mesmo padrão do
`match_audit_logs`): importação, ressincronização, edição de jogador, capitão,
temporadas, elencos, comissão e importação de elenco. Consulta em
`GET /api/clubs/:clubId/audit-logs`.

## Migração

`backend/drizzle/0015_club_squads_staff_seasons.sql` cria as tabelas
`club_seasons`, `club_squads`, `club_squad_members`, `club_staff` e
`club_audit_logs`, além das colunas de cores/uniformes em `clubs`. A reversão
(DOWN) está documentada como comentário no final do arquivo.

## Próximo ciclo

O próximo ciclo adicionará o formato eliminatório. Primeiro serão modeladas
rodadas e relações entre partidas; depois virão geração automática de
confrontos e chaveamento visual.