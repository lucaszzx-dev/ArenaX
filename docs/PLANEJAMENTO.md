# ArenaX — planejamento inicial

Status: proposta aguardando aprovação  
Última atualização: 23 de julho de 2026

## 1. Proposta curta do produto

ArenaX será uma plataforma web responsiva para organizadores criarem e administrarem campeonatos amadores, enquanto jogadores e visitantes acompanham participantes, partidas, placares e classificação em uma página pública.

O diferencial inicial será tornar a operação do campeonato simples e dar destaque visual ao que importa no esporte: próxima partida, placar e posição na tabela. A identidade será esportiva e tecnológica, com tipografia forte, boa leitura e cores próprias, sem copiar a marca ou a composição visual de outros produtos.

## 2. Escopo exato do primeiro MVP

### Entra no MVP

- Cadastro com nome, e-mail e senha.
- Login, logout e sessão persistente por cookie seguro.
- Perfil básico com nome público e avatar opcional por URL.
- Criação e edição básica de campeonato.
- Campeonato de pontos corridos. A pontuação por vitória, empate e derrota será definida de forma simples conforme o esporte.
- Modalidade de inscrição escolhida ao criar o campeonato: jogadores individuais ou equipes.
- Cadastro manual de participantes.
- Criação manual de equipes e inclusão manual de jogadores pelo organizador.
- Criação manual de partidas entre os inscritos.
- Registro e correção de placar pelo organizador.
- Classificação calculada a partir das partidas finalizadas.
- Página pública do campeonato com visão geral, classificação, participantes e partidas.
- Permissões básicas: organizador pode administrar seu campeonato; participante e visitante somente consultam.
- Estados essenciais da interface: carregamento, vazio, sucesso, validação e erro.
- Layout responsivo, acessível por teclado e adequado a celular e desktop.
- Validação no frontend para usabilidade e no backend como fonte de verdade.
- Testes de integração das rotas e regras mais importantes.

### Não entra no MVP

- Formato eliminatório, mata-mata ou fase de grupos.
- Geração automática de calendário ou confrontos.
- Convites por e-mail, link ou notificação.
- Solicitação e aprovação de inscrição.
- Autoadesão de jogadores a equipes; no MVP o organizador faz o cadastro.
- Vários organizadores por campeonato.
- Papéis administrativos globais.
- Partidas ao vivo, Socket.IO ou qualquer atualização em tempo real.
- Notificações.
- Chaveamento visual.
- Estatísticas individuais ou avançadas.
- Detalhamento do placar por sets, mapas, períodos, rounds ou prorrogação. No MVP será salvo somente o resultado final.
- Upload e tratamento de imagens; o perfil poderá usar apenas uma URL opcional.
- Recuperação de senha e verificação de e-mail.
- Login social.
- Aplicativo nativo.
- Tema escuro e animações. A base visual será preparada para ambos, mas eles virão depois.
- Monetização, assinaturas e publicidade.

## 3. Fluxo principal do usuário

### Organizador

1. Acessa o ArenaX e cria uma conta ou entra.
2. Completa ou revisa seu perfil básico.
3. Cria um campeonato, escolhe nome, esporte, modalidade de inscrição e datas.
4. Cadastra jogadores individuais ou cria equipes e adiciona seus jogadores.
5. Cria manualmente as partidas escolhendo os dois adversários e a data.
6. Registra o placar após a partida.
7. Confere a classificação recalculada.
8. Compartilha a URL pública do campeonato.

### Visitante ou participante

1. Abre a URL pública sem precisar entrar.
2. Vê informações do campeonato.
3. Consulta classificação, participantes e calendário/resultados.
4. Abre o detalhe de uma partida.

Fluxo resumido:

```text
Cadastro/login
      ↓
Painel do organizador
      ↓
Criar campeonato
      ↓
Cadastrar participantes/equipes
      ↓
Criar partidas
      ↓
Registrar placares
      ↓
Classificação + página pública
```

## 4. Principais telas

1. **Página inicial:** proposta do ArenaX, campeonatos recentes no futuro e acesso a login/cadastro.
2. **Cadastro:** nome, e-mail, senha e confirmação de senha.
3. **Login:** e-mail, senha e mensagens de erro compreensíveis.
4. **Perfil:** visualização e edição dos dados básicos.
5. **Meus campeonatos:** lista, estados vazios e ação para criar.
6. **Novo/editar campeonato:** dados gerais e modalidade de inscrição.
7. **Painel do campeonato:** resumo e navegação administrativa.
8. **Gerenciar participantes:** jogadores ou equipes, conforme a modalidade.
9. **Gerenciar partidas:** lista, criação manual e ação para registrar placar.
10. **Registrar placar:** adversários, placar e confirmação.
11. **Página pública do campeonato:** cabeçalho próprio, visão geral, classificação, participantes e partidas.
12. **Detalhe público da partida:** adversários, horário, status e placar.
13. **Páginas de sistema:** não encontrado, acesso negado e erro inesperado.

Em telas pequenas, a informação prioritária será exibida nesta ordem: placar/partida, classificação e detalhes secundários.

## 5. Modelo inicial do banco

Os nomes abaixo são conceituais. A implementação final poderá usar `snake_case` no PostgreSQL e nomes equivalentes em TypeScript.

### `users`

- `id` (UUID, chave primária)
- `email` (único)
- `password_hash`
- `created_at`
- `updated_at`

### `profiles`

- `user_id` (chave primária e estrangeira para `users`)
- `display_name`
- `avatar_url` (opcional)
- `bio` (opcional e curta)
- `updated_at`

Separar credenciais de perfil reduz o risco de expor dados sensíveis em consultas públicas.

### `sessions`

- `id` (UUID, chave primária)
- `user_id` (estrangeira para `users`)
- `token_hash` (único; o token puro fica somente no cookie)
- `expires_at`
- `created_at`

Essa abordagem permite invalidar a sessão no logout. A senha será armazenada somente como hash forte, nunca em texto puro.

### `championships`

- `id` (UUID, chave primária)
- `organizer_id` (estrangeira para `users`)
- `name`
- `slug` (único, usado na URL pública)
- `sport`
- `description` (opcional)
- `entry_type` (`INDIVIDUAL` ou `TEAM`)
- `win_points`
- `draw_points`
- `loss_points`
- `allows_draw`
- `status` (`DRAFT`, `PUBLISHED`, `FINISHED`)
- `starts_at` (opcional)
- `ends_at` (opcional)
- `created_at`
- `updated_at`

### `teams`

- `id` (UUID, chave primária)
- `championship_id` (estrangeira para `championships`)
- `name`
- `short_name` (opcional)
- `created_at`

No MVP, uma equipe pertence a um campeonato. Isso evita introduzir cedo demais o conceito mais complexo de clubes reutilizáveis.

### `team_members`

- `id` (UUID, chave primária)
- `team_id` (estrangeira para `teams`)
- `display_name`
- `user_id` (opcional, estrangeira para `users`)
- `created_at`

O nome funciona sem exigir que cada jogador tenha uma conta. O vínculo com `users` fica opcional para evolução futura.

### `championship_entries`

- `id` (UUID, chave primária)
- `championship_id` (estrangeira para `championships`)
- `display_name`
- `user_id` (opcional, para campeonato individual)
- `team_id` (opcional, para campeonato por equipes)
- `created_at`

Uma restrição no banco garantirá que cada inscrição aponte para exatamente um jogador ou uma equipe, nunca para ambos. Partidas sempre referenciam inscrições, o que mantém uma única estrutura para as duas modalidades.

### `matches`

- `id` (UUID, chave primária)
- `championship_id` (estrangeira para `championships`)
- `home_entry_id` (estrangeira para `championship_entries`)
- `away_entry_id` (estrangeira para `championship_entries`)
- `scheduled_at` (opcional)
- `status` (`SCHEDULED`, `FINISHED`, `CANCELED`)
- `home_score` (opcional)
- `away_score` (opcional)
- `created_at`
- `updated_at`

No MVP, `home_score` e `away_score` serão números inteiros não negativos que representam somente o resultado final. Em futebol podem significar gols; em vôlei, sets vencidos; em eSports, mapas vencidos. Não armazenaremos ainda o placar de cada set, mapa ou período.

Restrições impedirão um participante de enfrentar a si mesmo e placares negativos. A regra de negócio também verificará que os dois inscritos pertencem ao mesmo campeonato da partida e se aquele esporte permite empate.

### Classificação

Não haverá uma tabela de classificação no início. Ela será calculada no backend a partir das partidas finalizadas, produzindo jogos, vitórias, empates, derrotas, pontos marcados, pontos sofridos, saldo e pontos na tabela. Isso evita dados duplicados e inconsistentes no MVP. Se medições futuras mostrarem necessidade, poderemos materializar esse resultado.

## 6. Como as três camadas se comunicam

```text
React no navegador
      │ requisições HTTPS + JSON
      │ cookie de sessão HttpOnly enviado automaticamente
      ▼
Rotas Fastify
      │ valida e autentica
      ▼
Serviços/regras de negócio
      │ decide permissões e operações
      ▼
Repositórios com Drizzle
      │ SQL parametrizado
      ▼
PostgreSQL
```

- O React exibe telas e envia ações para uma API HTTP, por exemplo `POST /api/championships`.
- O TanStack Query controla cache, carregamento, erros e atualização dos dados recebidos.
- O Fastify recebe a requisição e usa Zod para validar corpo, parâmetros e consulta.
- A camada de serviço aplica regras como “somente o organizador pode alterar o placar”.
- A camada de repositório lê e grava dados usando o ORM.
- O PostgreSQL é acessível apenas pelo backend.
- O backend responde com JSON e códigos HTTP coerentes.
- A autenticação usa um cookie `HttpOnly`, `Secure` em produção e `SameSite` adequado. O JavaScript do navegador não lê o token.

Durante o desenvolvimento, frontend e backend rodam em processos separados. A configuração de CORS e cookies permitirá apenas a origem esperada. URLs, credenciais e chaves ficarão em variáveis de ambiente; somente um arquivo `.env.example` sem segredos será versionado.

## 7. Prisma ou Drizzle?

| Critério | Prisma | Drizzle |
| --- | --- | --- |
| Aprendizado inicial | API muito amigável e boa experiência de desenvolvimento | Exige entender um pouco mais de SQL e do banco |
| Relação com SQL | Abstração maior | Mais explícito e próximo do SQL |
| Schema | Linguagem própria do Prisma | Schema escrito em TypeScript |
| Migrações | Ferramentas maduras e guiadas | Migrações simples, explícitas e inspecionáveis |
| Consultas complexas | API conveniente, mas às vezes mais abstrata | Dá controle direto e composição semelhante a SQL |
| Peso e geração | Cliente gerado e fluxo próprio | Biblioteca leve, sem cliente pesado gerado |
| Adequação ao aprendizado | Facilita começar rapidamente | Ensina melhor como TypeScript, consultas e PostgreSQL se relacionam |

### Recomendação: Drizzle

Para o ArenaX, recomendo **Drizzle ORM com `node-postgres`**. Você já teve contato com PostgreSQL e migrações, então a proximidade com SQL será uma vantagem didática, não apenas complexidade. O schema em TypeScript também ajuda a praticar tipos sem aprender simultaneamente uma segunda linguagem de schema.

Prisma seria uma escolha válida se a prioridade absoluta fosse reduzir o atrito nas primeiras consultas. Drizzle combina melhor com nosso objetivo de aprender o backend e manter claras as operações feitas no PostgreSQL. Não usaremos recursos avançados antes de precisar deles.

## 8. Fases pequenas de desenvolvimento

Cada fase deve terminar com lint, testes relevantes e build funcionando. Os commits serão pequenos e descreverão uma mudança por vez.

### Fase 0 — decisões e preparação

- Aprovar este planejamento.
- Definir a primeira direção visual.
- Confirmar requisitos locais: versões de Node.js, gerenciador de pacotes, Docker e PostgreSQL.
- Criar Git, estrutura de pastas, README e arquivos de ambiente de exemplo.
- Criar o repositório remoto no GitHub e conectar o repositório local.

### Fase 1 — fundamentos de TypeScript e API

- Criar o backend Fastify mínimo.
- Entender tipos, interfaces, inferência e módulos por meio de exemplos do projeto.
- Criar rota de saúde e primeiro teste de integração.
- Configurar lint, formatação e scripts.

### Fase 2 — banco e primeira funcionalidade vertical

- Subir/conectar PostgreSQL.
- Configurar Drizzle e migrações.
- Implementar `users` e `profiles`.
- Criar uma rota simples atravessando rota, serviço, repositório e banco.

### Fase 3 — autenticação

- Implementar cadastro e hash de senha.
- Implementar sessão por cookie, login e logout.
- Testar autenticação, expiração e erros.
- Criar as telas correspondentes no React.

### Fase 4 — base visual e navegação

- Definir tokens de cor, tipografia, espaçamento e componentes essenciais.
- Criar layout responsivo e rotas principais.
- Configurar cliente HTTP e TanStack Query.
- Não adicionar animações nesta fase.

### Fase 5 — campeonatos e permissões

- Criar, listar, visualizar e editar campeonato.
- Implementar slug público.
- Restringir alterações ao organizador.
- Testar autorização no backend.

### Fase 6 — inscrições, equipes e participantes

- Implementar inscrições individuais.
- Implementar equipes e membros.
- Criar interfaces administrativas e estados vazios.

### Fase 7 — partidas e placares

- Criar partidas manualmente.
- Registrar e corrigir placares.
- Validar adversários, status e permissões.

### Fase 8 — classificação e página pública

- Calcular classificação com critérios de desempate documentados.
- Criar visão pública responsiva.
- Exibir partidas e detalhe da partida.

### Fase 9 — qualidade do MVP

- Revisar acessibilidade, segurança, mensagens de erro e responsividade.
- Completar testes de integração e casos críticos do frontend.
- Preparar dados de demonstração.
- Documentar execução e decisões.

### Fase 10 — deploy

- Escolher hospedagens apenas quando conhecermos as necessidades reais.
- Configurar banco, backend e frontend.
- Configurar variáveis, cookies, CORS, migrações e observabilidade básica.
- Executar verificação pós-deploy.

## 9. Primeira tarefa prática do estudante

Antes de criarmos a estrutura, escreva uma pequena **história do usuário e critérios de aceitação** para a criação de campeonato. Use este molde:

```text
Como [tipo de pessoa],
quero [ação],
para [benefício].

Critérios de aceitação:
- ...
- ...
- ...
```

Inclua o que deve acontecer quando:

- os dados são válidos;
- o nome está vazio;
- a data final é anterior à inicial;
- uma pessoa não autenticada tenta criar;
- um usuário tenta editar o campeonato de outro organizador.

Essa tarefa é pequena, mas será usada de verdade: seus critérios orientarão o schema de validação, as regras do serviço e os testes de integração da funcionalidade.

## 10. Decisões técnicas iniciais

### Esportes iniciais

Para oferecer opções populares sem exagerar, o MVP começará com:

- futebol;
- futsal;
- basquete;
- vôlei;
- eSports.

Também haverá a opção `Outro`, com nome informado pelo organizador. Todos usarão placar final inteiro no MVP. Vôlei e eSports poderão registrar, por exemplo, `3 × 1` sets ou `2 × 1` mapas, mas sem detalhar o resultado interno de cada set ou mapa.

### Gerenciador de pacotes

Usaremos **pnpm**. A máquina já possui pnpm 11.9.0, npm 11.12.1 e Node.js 24.15.0. O pnpm economiza espaço, instala dependências rapidamente e funciona bem para manter frontend e backend no mesmo workspace. Não precisamos instalar Yarn nem adicionar outra ferramenta.

Antes do primeiro código, verificaremos se a versão atual do Node é compatível com todas as dependências. Para um projeto que será implantado, poderemos fixar uma versão LTS suportada em vez de depender da versão instalada globalmente.

### PostgreSQL no desenvolvimento

Usaremos **PostgreSQL em Docker** como direção recomendada. Hoje a máquina não possui Docker nem `psql`, portanto essa etapa dependerá da instalação do Docker Desktop pelo usuário.

O Docker nos dará uma versão de PostgreSQL reproduzível, isolada e documentada, sem misturar os arquivos do banco com a instalação do Windows. Os dados serão persistidos em um volume local. Um serviço hospedado ficará para o deploy; ele adicionaria rede, custo potencial e gerenciamento de credenciais cedo demais.

Se o Docker Desktop não puder ser instalado ou for pesado demais para a máquina, a alternativa será PostgreSQL local. Essa troca não altera a arquitetura da aplicação.

### Estratégia de commits e GitHub

- Faremos um commit local a cada progresso pequeno que deixe o projeto em um estado coerente.
- Não faremos um commit para cada linha ou tentativa quebrada.
- Antes de cada commit, revisaremos o diff e executaremos as verificações relevantes.
- As mensagens explicarão a intenção, por exemplo: `docs: define initial MVP scope` ou `feat(auth): add user registration route`.
- O histórico local será enviado ao GitHub depois que o repositório remoto estiver criado e autenticado.
- Por padrão, agruparemos o envio ao GitHub por marco de trabalho. Se for útil, também poderemos enviar cada commit imediatamente.
- Nenhum segredo, arquivo `.env` real ou credencial será incluído.

## 11. Decisões ainda pendentes

- Aprovar ou ajustar o planejamento.
- Definir a direção visual inicial sem fechar ainda todos os detalhes.
- Confirmar se o Docker Desktop pode ser instalado e executado nesta máquina.
- Criar ou indicar o repositório do GitHub antes do primeiro `push`.

## Registro de andamento

| Data | Etapa | Estado | Observação |
| --- | --- | --- | --- |
| 23/07/2026 | Inspeção inicial | Concluída | Pasta vazia e sem repositório Git |
| 23/07/2026 | Planejamento inicial | Aguardando aprovação | Nenhum código ou dependência criado |
| 23/07/2026 | Diagnóstico do ambiente | Concluído | Node, npm, pnpm e Git disponíveis; Docker, PostgreSQL e GitHub CLI ausentes |
| 23/07/2026 | Decisões técnicas iniciais | Propostas | pnpm, PostgreSQL em Docker e commits por progresso coerente |
