# ArenaX

Plataforma web para criar, administrar e acompanhar campeonatos amadores de esportes e jogos.

## Estado atual

O projeto está na fase inicial de preparação. O escopo e as decisões estão documentados em [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md).

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

As instruções de instalação e execução serão adicionadas conforme cada parte for implementada.

## Segurança

Arquivos `.env` reais não devem ser enviados ao Git. Cada aplicação terá um `.env.example` contendo apenas nomes e valores fictícios.
