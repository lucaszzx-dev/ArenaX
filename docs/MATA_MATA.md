# Mata-mata e chaveamento

Implementado em 29 de julho de 2026.

## Geração

- disponível somente para arenas criadas no formato mata-mata;
- exige pelo menos dois inscritos e arena em rascunho;
- calcula a próxima potência de dois para definir o tamanho da chave;
- distribui folgas quando a quantidade de inscritos não completa a chave;
- cria confrontos somente quando os dois lados da posição são conhecidos;
- impede geração duplicada ou sobre um calendário existente.

## Progressão

Ao finalizar um confronto sem empate, o vencedor ocupa automaticamente sua
posição na fase seguinte. Quando os dois classificados são conhecidos, a nova
partida é criada.

A final concluída determina o campeão exibido no chaveamento administrativo e
público.

## Proteções

- partidas do chaveamento não podem ser criadas ou excluídas manualmente;
- resultados eliminatórios não aceitam empate;
- uma correção exige reabrir a partida;
- uma partida não pode ser reaberta se o confronto seguinte já foi formado;
- partidas finalizadas do chaveamento precisam ser reabertas antes de cancelar.

Essas restrições evitam que uma alteração apague ou substitua silenciosamente
um participante que já avançou.

## Limites atuais

A disputa opcional de terceiro lugar e a escolha manual das cabeças de chave
serão extensões posteriores. A primeira versão usa a ordem estável dos inscritos
para formar a chave.
