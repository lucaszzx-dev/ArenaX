# ArenaX — elencos e eventos esportivos

Última revisão: 29 de julho de 2026.

## Objetivo da próxima fase

Evoluir a partida de um placar final simples para uma súmula que informe como
o resultado aconteceu, sem tentar implementar todos os esportes ao mesmo
tempo.

A primeira entrega será para futebol e futsal. Basquete e vôlei reutilizarão
a mesma base em fases posteriores.

## Esportes priorizados

1. Futebol e futsal: gols, gol contra e cartões. Implementado.
2. Basquete: lances livres, cestas de dois e três pontos e quartos.
   Implementado no painel do organizador.
3. Vôlei: pontos, aces, bloqueios e sets. Implementado no painel do
   organizador.
4. eSports: mapas ou rounds configuráveis, depois que os esportes físicos
   estiverem estáveis.

`Outro` continuará aceitando somente o placar final até existir uma
configuração segura para eventos personalizados.

## Decisões de modelagem

### Elenco

`team_members` continuará representando os jogadores cadastrados em uma
equipe. Serão acrescentados:

- `jersey_number`: número da camisa, opcional;
- `position`: posição escrita pelo organizador, opcional.

O jogador não precisará ter conta no ArenaX. O vínculo opcional com `users`
continuará disponível para convites futuros.

### Eventos da partida

A nova tabela `match_events` terá:

- `id`;
- `match_id`;
- `entry_id`: equipe ou participante que recebeu o evento;
- `team_member_id`: jogador do elenco, opcional;
- `actor_name`: nome preservado no histórico, opcional;
- `type`: tipo do evento validado conforme o esporte;
- `value`: valor numérico do evento;
- `period_number`: período da partida, opcional;
- `clock_seconds`: momento dentro do período, opcional;
- `notes`: observação curta, opcional;
- `created_at`.

O `entry_id` é obrigatório. Assim o organizador pode registrar um gol para a
equipe mesmo quando ainda não sabe quem marcou. Quando houver jogador, o
backend confirmará que ele pertence à equipe indicada.

### Placar e súmula

`matches.home_score` e `matches.away_score` continuarão guardando o resultado
oficial. Isso preserva os campeonatos existentes e mantém a classificação
rápida.

Para futebol e futsal:

- eventos `GOAL` e `OWN_GOAL` participam da conferência do placar;
- cartões não alteram o placar;
- a partida só será finalizada quando o placar informado for compatível com
  os gols registrados;
- durante a transição, partidas sem eventos continuarão aceitando placar
  manual.

A aplicação não recalculará silenciosamente resultados antigos.

## Regras da primeira entrega

- Somente o organizador pode criar, editar ou excluir eventos.
- A partida, a inscrição e o jogador devem pertencer ao mesmo campeonato.
- Futebol e futsal aceitam `GOAL`, `OWN_GOAL`, `YELLOW_CARD` e `RED_CARD`.
- O período, quando informado, deve ser positivo.
- O relógio, quando informado, não pode ser negativo.
- `value` será `1` nos eventos iniciais de futebol/futsal.
- Um evento removido atualiza a súmula, mas não altera automaticamente uma
  partida já finalizada sem confirmação do organizador.
- A página pública exibirá a linha do tempo sem expor dados privados.

## Entregas pequenas

### Etapa A — banco e domínio

- ampliar o elenco;
- criar `match_events`;
- criar repositório e serviço;
- validar permissões e vínculo entre jogador, equipe e partida;
- cobrir as regras com testes de integração.

Status em 29 de julho de 2026: concluída no backend. A migração foi aplicada
no PostgreSQL local, e as regras foram cobertas por testes de serviço e rota.
O painel ainda não expõe os novos controles; isso pertence à Etapa B.

### Etapa B — painel do organizador

- editar número e posição dos jogadores;
- adicionar e remover eventos;
- escolher equipe, jogador, tipo, período e minuto;
- conferir o placar antes de finalizar.

Status em 29 de julho de 2026: primeira versão concluída. O cadastro de
jogadores aceita camisa e posição, e partidas de futebol/futsal permitem
adicionar e remover gols, gols contra e cartões. A conferência automática
entre gols e placar continuará em uma entrega própria para não mudar o
resultado oficial sem uma regra explícita.

### Etapa C — experiência pública

- exibir autores dos gols e cartões;
- ordenar a linha do tempo;
- apresentar eventos sem autor como “autor não informado”;
- adaptar a visualização para celular.

### Etapa D — novos esportes

- conferência entre eventos e placar do basquete;
- placar detalhado de cada set do vôlei;
- mapas/rounds de eSports;
- estatísticas individuais derivadas dos eventos.

Status em 29 de julho de 2026: parciais de basquete e vôlei implementadas.
A tabela genérica `match_periods` registra até cinco sets no vôlei e quatro
quartos mais prorrogações no basquete. O organizador pode salvar, corrigir e
remover parciais, que também aparecem na partida pública. A finalização
automática a partir das parciais e a conferência com eventos individuais
permanecem para a próxima entrega.

## Catálogo reservado para jogos futuros

O banco usa `type` textual validado no backend, em vez de um enum PostgreSQL.
Isso permite acrescentar modalidades sem reconstruir a tabela. Os tipos
abaixo estão planejados, mas ainda não são aceitos pela API:

- eSports: `MAP_WIN`, `ROUND_WIN`, `ELIMINATION`, `OBJECTIVE`;
- tênis e beach tennis: `SET_WIN`, `GAME_WIN`, `ACE`, `DOUBLE_FAULT`;
- handebol: `GOAL`, `TWO_MINUTE_SUSPENSION`, `YELLOW_CARD`, `RED_CARD`;
- hóquei: `GOAL`, `ASSIST`, `PENALTY`;
- jogos de luta: `ROUND_WIN`, `KNOCKDOWN`, `KNOCKOUT`.

Cada grupo somente será ativado quando também possuir regras, nomes
compreensíveis, períodos adequados e testes. A API não aceitará tipos
arbitrários enviados pelo frontend.

## Fora desta fase

- Socket.IO e atualização ao vivo;
- substituições e escalação titular/reserva;
- assistências;
- acréscimos complexos;
- pênaltis individuais;
- súmula assinada;
- importação de dados externos;
- estatísticas avançadas.

Esses recursos serão avaliados depois que a criação, validação e exibição dos
eventos básicos estiverem estáveis.
