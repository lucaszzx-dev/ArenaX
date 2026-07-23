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
