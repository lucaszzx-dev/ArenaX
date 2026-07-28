# ArenaX

Plataforma web para criar, administrar e acompanhar campeonatos amadores de esportes e jogos.

## Estado atual

A fundação full-stack e a primeira fatia de autenticação estão implementadas. O escopo e as decisões estão documentados em [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md).

## Estrutura

```text
arenax/
├── frontend/  # React, TypeScript e Vite
├── backend/   # Node.js, TypeScript e Fastify
├── docs/      # Planejamento e decisões
└── README.md
```

## Requisitos de desenvolvimento

- Node.js 24 ou superior
- pnpm 11 ou superior
- Docker Desktop (será usado para o PostgreSQL)

## Preparação

1. Instale o Docker Desktop e mantenha-o aberto.
2. Instale as dependências:

   ```bash
   pnpm install
   ```

3. Crie os arquivos locais de ambiente:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

4. Inicie o PostgreSQL:

   ```bash
   docker compose up -d
   ```

5. Execute a migração:

   ```bash
   pnpm --dir backend db:migrate
   ```

6. Inicie frontend e backend:

   ```bash
   pnpm dev
   ```

O frontend ficará em `http://localhost:5173` e a API em `http://localhost:3333`.

Para ativar o Login com Google, siga [docs/GOOGLE_LOGIN.md](docs/GOOGLE_LOGIN.md).

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

O comando recria somente a conta e a arena demonstrativas. Consulte
[docs/QUALITY_AND_DEPLOY.md](docs/QUALITY_AND_DEPLOY.md) para o checklist de
qualidade, auditoria e deploy.

## Segurança

Arquivos `.env` reais não devem ser enviados ao Git. Cada aplicação terá um `.env.example` contendo apenas nomes e valores fictícios.
