# ArenaX

Plataforma web para criar, administrar e acompanhar campeonatos amadores de esportes e jogos.

## Estado atual

O MVP está funcional de ponta a ponta: autenticação (e-mail/senha e Google OAuth),
campeonatos em liga e mata-mata, partidas e resultados, estatísticas, clubes com
elenco/squads/temporadas/comissão, importação e exportação de elenco, sincronização
manual clube → equipe, perfis públicos e notificações. O planejamento completo está
em [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md) e o roadmap futuro em
[docs/ROADMAP.md](docs/ROADMAP.md).

## Estrutura

```text
arenax/
├── frontend/  # React, TypeScript e Vite
├── backend/   # Node.js, TypeScript e Fastify
├── e2e/       # Testes Playwright
├── docs/      # Planejamento e decisões
└── README.md
```

## Requisitos de desenvolvimento

- Node.js 24 ou superior
- pnpm 11 ou superior
- Docker Desktop (para o PostgreSQL local)

## Ambiente local

1. **Docker Desktop** — instale e mantenha aberto.
2. **Suba o PostgreSQL:**

   ```bash
   docker compose up -d
   ```

3. **Instale as dependências:**

   ```bash
   pnpm install
   ```

4. **Crie os arquivos locais de ambiente:**

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

5. **Aplique as migrações:**

   ```bash
   pnpm --dir backend db:migrate
   ```

6. **Inicie o backend (porta 3333):**

   ```bash
   pnpm --filter "./backend" dev
   ```

7. **Inicie o frontend (porta 5173):**

   ```bash
   pnpm --filter "./frontend" dev
   ```

   Ou os dois juntos com `pnpm dev`.

Abra `http://localhost:5173`. O frontend usa o proxy do Vite para `/api`, que aponta
para `http://localhost:3333` em desenvolvimento (veja `frontend/vite.config.ts`).
Em produção, defina `VITE_API_URL` no painel da Vercel/Render apontando para o
backend, ex. `https://seu-backend.example.com/api`.

## Login com Google (opcional)

O Login com Google é opcional. Sem ele, cadastro e login por e-mail/senha
continuam funcionando. Para ativar, siga [docs/GOOGLE_LOGIN.md](docs/GOOGLE_LOGIN.md)
e preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`
no `backend/.env`. Nunca publique o client secret.

## Verificações

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
```

## Dados demonstrativos

Com Docker e PostgreSQL ligados:

```bash
pnpm --dir backend db:seed
```

O comando recria somente a conta e a arena demonstrativas.

## Troubleshooting

### `ERR_CONNECTION_REFUSED` em `:3333` (`/api/health`, `/api/auth/me`)

O navegador só mostra esse erro quando o backend não está no ar. Verifique:

- O backend está rodando? `pnpm --filter "./backend" dev` deve exibir o log de startup.
- A porta 3333 está livre? `netstat -ano | findstr 3333` (Windows) mostra quem está escutando.
- O `backend/.env` existe e tem `PORT=3333` e `DATABASE_URL` válida?

O frontend em desenvolvimento usa o proxy do Vite para `/api`; se o backend
estiver de pé, as chamadas passam a responder em `http://localhost:5173/api/...`.

### PostgreSQL desligado

- Suba com `docker compose up -d` e aguarde o healthcheck.
- Teste com `docker compose exec postgres pg_isready -U arenax -d arenax`.
- Com o banco fora do ar, `GET /api/health` responde `{"status":"degraded","database":"unreachable"}`
  e o frontend mostra o aviso "O banco de dados está indisponível".
- O backend continua no ar; suba o banco e recarregue a página.

### Migration falhando

- Confirme que o PostgreSQL está acessível (`docker compose ps`).
- Rode novamente com logs: `pnpm --dir backend db:migrate`.
- Nunca use `db:push` em produção para substituir migrações.
- Migrações novas são criadas com `pnpm --dir backend db:generate` e aplicadas com `db:migrate`.

### OAuth Google não configurado

- O botão "Continuar com Google" leva de volta para `/entrar?erro=google_not_configured`.
- Preencha as variáveis no `backend/.env` (veja [docs/GOOGLE_LOGIN.md](docs/GOOGLE_LOGIN.md)).
- Se aparecer `redirect_uri_mismatch` no Google, confira se a URI autorizada no
  Google Cloud é exatamente `GOOGLE_REDIRECT_URI` do `.env` (protocolo, porta e caminho).

## Segurança

Arquivos `.env` reais não devem ser enviados ao Git. Cada aplicação terá um
`.env.example` contendo apenas nomes e valores fictícios.