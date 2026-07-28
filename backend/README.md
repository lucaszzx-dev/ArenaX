# Backend

API do ArenaX construída com Node.js, TypeScript e Fastify.

## Comandos

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

O servidor usa a porta `3333` por padrão. A rota `GET /health` informa se a API está respondendo.

## Organização atual

```text
src/
├── auth/    # regras de autenticação e repositório
├── config/  # validação das variáveis de ambiente
├── db/      # conexão e schema Drizzle
├── errors/  # erros compreensíveis da aplicação
└── routes/  # entrada HTTP
```

As rotas de autenticação disponíveis são:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/championships`
- `GET /api/championships`
- `GET /api/championships/:id`
- `PUT /api/championships/:id`
- `GET /api/championships/:id/participants`
- `POST /api/championships/:id/participants`
- `DELETE /api/championships/:id/participants/:participantId`
- `POST /api/championships/:id/teams`
- `DELETE /api/championships/:id/teams/:teamId`
- `POST /api/championships/:id/teams/:teamId/members`
- `DELETE /api/championships/:id/teams/:teamId/members/:memberId`
- `GET /api/championships/:id/matches`
- `POST /api/championships/:id/matches`
- `DELETE /api/championships/:id/matches/:matchId`
- `PUT /api/championships/:id/matches/:matchId/score`
- `GET /api/championships/:id/standings`
- `GET /api/public/championships/:slug`
- `PUT /api/championships/:id/status`
- `PUT /api/championships/:id/matches/:matchId/schedule`
- `PUT /api/championships/:id/matches/:matchId/status`
- `GET /api/public/championships/:slug/matches/:matchId`
