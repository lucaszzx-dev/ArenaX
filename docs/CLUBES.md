# Clubes reutilizáveis

Implementado em 29 de julho de 2026.

## Clube e equipe não são a mesma coisa

O clube pertence ao organizador e pode ser reutilizado. Ele guarda nome, sigla,
escudo e elenco principal.

A equipe pertence a uma arena específica. Ao importar um clube, o ArenaX cria
uma cópia da identidade e do elenco naquele campeonato.

Essa cópia é intencional: alterar ou excluir o clube da biblioteca não modifica
equipes já inscritas, súmulas, escalações ou resultados históricos.

## Regras atuais

- somente o proprietário pode consultar e alterar seus clubes;
- nomes de clubes não podem se repetir na mesma biblioteca;
- um clube só pode ser importado uma vez em cada arena;
- a importação existe apenas em arenas por equipes;
- capitão, camisa e posição são copiados junto com o elenco;
- depois da importação, clube e equipe evoluem de forma independente.

## Próximo ciclo

O próximo ciclo adicionará o formato eliminatório. Primeiro serão modeladas
rodadas e relações entre partidas; depois virão geração automática de
confrontos e chaveamento visual.
