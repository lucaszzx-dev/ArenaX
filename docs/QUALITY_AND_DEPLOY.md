# Qualidade e preparação para deploy

Última revisão: 3 de agosto de 2026.

## Estado verificado

- Build TypeScript do frontend e backend.
- Lint do frontend e backend.
- Testes automatizados do backend (Vitest) e do frontend.
- Testes Playwright em desktop e viewport móvel.
- Seed demonstrativo executado duas vezes sem duplicar dados.
- Cookie de sessão `HttpOnly`, `SameSite=None` e `Secure` em produção.
- CORS restrito à URL configurada do frontend.
- Rate limit global e limites menores nas rotas de autenticação.
- Rascunhos indisponíveis nas rotas públicas.
- Foco visível para os controles interativos principais.

## Comandos de qualidade

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm audit --audit-level high
```

Os testes E2E exigem Docker/PostgreSQL e recriam somente os dados demo.

## Dados demonstrativos

```bash
pnpm --dir backend db:seed
```

```text
E-mail: demo@arenax.local
Senha: ArenaXDemo2026!
```

Essa senha é pública e serve apenas para desenvolvimento ou demonstração.
O seed não deve ser executado em produção sem uma decisão explícita.

## Variáveis do backend

```text
NODE_ENV=production
LOG_LEVEL=info
HOST=0.0.0.0
PORT=<porta fornecida pela hospedagem>
DATABASE_URL=<URL PostgreSQL de produção>
FRONTEND_URL=https://<domínio-do-frontend>
SESSION_COOKIE_NAME=arenax_session
SESSION_TTL_DAYS=7
GOOGLE_CLIENT_ID=<cliente OAuth>
GOOGLE_CLIENT_SECRET=<segredo OAuth>
GOOGLE_REDIRECT_URI=https://<backend>/api/auth/google/callback
```

## Variável do frontend

```text
VITE_API_URL=https://<domínio-do-backend>/api
```

Variáveis `VITE_` são públicas. Nunca colocar segredos nelas.

Em desenvolvimento local, `VITE_API_URL` não precisa ser definida: o Vite faz
proxy de `/api` para `http://localhost:3333` automaticamente (veja `vite.config.ts`).

## Plataformas escolhidas

- Banco: Neon PostgreSQL. O plano gratuito não expira, embora possua limites
  de armazenamento e processamento adequados para o MVP.
- Backend: Render Web Service. O plano gratuito pode suspender o serviço após
  um período sem acessos; a primeira requisição após a suspensão pode demorar.
- Frontend: Vercel (estático, `frontend/`).

O arquivo `render.yaml` descreve o backend sem incluir credenciais. As
variáveis marcadas como segredo devem ser preenchidas diretamente no painel
do Render.

Em produção, frontend e backend ficam em domínios diferentes. Por isso, o
cookie usa `SameSite=None` e `Secure`; o navegador só o envia por HTTPS.

## Pipeline de CI

O GitHub Actions (`.github/workflows/ci.yml`) roda em todo push/PR:

- install com lockfile congelado;
- build (backend + frontend);
- lint (backend + frontend);
- testes Vitest (backend + frontend);
- testes E2E (Playwright, chromium) contra um PostgreSQL de serviço.

O deploy automático do Render é disparado por commits na `main` (apenas
quando arquivos do backend mudam). Na Vercel, o deploy do frontend também é
automático.

## Checklist do deploy

1. Criar PostgreSQL hospedado (Neon) e guardar a URL como segredo.
2. Publicar o backend com `NODE_ENV=production`.
3. Executar `pnpm --dir backend db:migrate:prod` no banco de produção
   (o `startCommand` do Render já executa isso antes de subir).
4. Verificar `GET /health` (checa `select 1` no banco).
5. Publicar o frontend com a URL definitiva da API.
6. Atualizar `FRONTEND_URL` no backend.
7. Cadastrar no Google Cloud a origem do frontend e o callback HTTPS.
8. Testar cadastro, login, logout e Google OAuth.
9. Criar uma arena temporária, participantes, partida e placar.
10. Publicar a arena e abrir a URL em uma janela anônima.
11. Verificar cookies `HttpOnly` e `Secure`.
12. Remover os dados temporários usados na validação.

Detalhes de ambientes, rollback, backups e escala: `docs/DEPLOY_ROLLBACK.md`.

## Auditoria de dependências

O `pnpm audit` ainda informa um alerta alto no `react-router` relacionado ao
modo React Server Components (RSC). O ArenaX usa Vite no navegador e não
habilita RSC, actions de servidor ou o modo framework afetado.

Em 28 de julho de 2026, o aviso indica correção em `8.3.0`, versão que não está
publicada no npm, enquanto `7.18.1` é a versão estável disponível. O downgrade
reintroduz vários alertas já corrigidos. A decisão temporária é:

- manter `7.18.1`;
- não habilitar RSC;
- revisar o aviso antes do deploy;
- atualizar assim que existir uma versão estável corrigida.

## Rollback

- Frontend: restaurar o deploy anterior.
- Backend: restaurar a versão anterior sem apagar o banco.
- Banco: não executar rollback destrutivo automaticamente.
- Fazer backup antes de qualquer migração destrutiva.
