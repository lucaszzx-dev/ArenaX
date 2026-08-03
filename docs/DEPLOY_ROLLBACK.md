# Deploy, ambiente e rollback

Última revisão: 3 de agosto de 2026.

## Arquitetura de produção

- Frontend: Vercel (estático, `frontend/`).
- Backend: Render Web Service (Node, `backend/`), descrito em `render.yaml`.
- Banco: Neon PostgreSQL (planos free ou paid).

Frontend e backend ficam em domínios diferentes; o cookie de sessão usa
`SameSite=None` e `Secure`, então o navegador só o envia por HTTPS.

## Variáveis de ambiente

### Backend (painel do Render, como segredos quando sensível)

```text
NODE_ENV=production
LOG_LEVEL=info
HOST=0.0.0.0
PORT=10000
DATABASE_URL=<URL PostgreSQL do Neon, sync:false>
FRONTEND_URL=https://<frontend-na-vercel>
SESSION_COOKIE_NAME=arenax_session
SESSION_TTL_DAYS=7
GOOGLE_CLIENT_ID=<opcional>
GOOGLE_CLIENT_SECRET=<opcional>
GOOGLE_REDIRECT_URI=https://<backend>/api/auth/google/callback
```

- `DATABASE_URL` e `FRONTEND_URL` são obrigatórias: o backend para de iniciar
  (fail fast) se faltarem ou forem inválidas.
- `GOOGLE_*` são opcionais; sem elas a rota OAuth responde 503.

### Frontend (painel da Vercel)

```text
VITE_API_URL=https://<backend>/api
```

Variáveis `VITE_` são públicas e embutidas no build. Nunca colocar segredos.

## Migrações

- Local: `pnpm --dir backend db:migrate` (usa `backend/.env`).
- Produção: `pnpm --dir backend db:migrate:prod` (usa as variáveis do
  ambiente; sem depender de arquivo `.env`).
- `render.yaml` executa `db:migrate:prod` no `startCommand`, antes de subir a
  nova versão. Se a migração falhar, o container não inicia e o Render
  mantém a versão anterior.

Regras de migração segura:

- Nunca editar migrações já aplicadas; criar uma nova.
- Migrações destrutivas (drop de coluna/tabela) exigem backup prévio.
- Preferir duas etapas para mudanças grandes: deploy da migração compatível
  com o código antigo, depois deploy do código novo.

## Health check

- `GET /health` e `GET /api/health`.
- Com `checkDatabase` ativo (servidor de produção), executa `select 1` e
  responde:
  - `{ "status": "ok", "database": "ok" }`
  - `{ "status": "degraded", "database": "unreachable" }` se o banco falhar.
- O `healthCheckPath` do Render aponta para `/health`.

## Logs e monitoramento

- Logs estruturados (JSON) via Pino/Fastify, com nível controlado por
  `LOG_LEVEL`.
- Cookies e cabeçalhos de autorização são mascarados (`[REDACTED]`) nos logs.
- No plano free, os logs ficam no painel do Render; em planos pagos é
  possível enviar para um agregador (ex.: Better Stack, Grafana Cloud).

## Backup e recuperação (Neon)

- Neon oferece PITR (point-in-time recovery) e branches:
  - Criar um branch antes de aplicar migrações destrutivas.
  - Usar PITR para recuperar de erros operacionais.
- Backup manual adicional com `pg_dump`:
  `pg_dump "$DATABASE_URL" --format=custom --file=backup-$(date +%F).dump`
- Testar a restauração em um banco temporário antes de confiar no processo.
- Ver também `docs/BACKUP_RESTORE.md`.

## Rollback

- Frontend (Vercel): promover o deploy anterior no painel (Immediate
  Rollback) ou reverter o commit e republicar.
- Backend (Render): restaurar a versão anterior no painel sem tocar no banco.
- Banco: não executar rollback destrutivo automaticamente. Se a migração
  nova causou problema, aplicar uma migração corretiva (nova) em vez de
  reverter, ou restaurar de backup/PITR.
- Ordem recomendada: 1) avaliar se o problema é de código ou dado;
  2) rollback de frontend/backend se for código; 3) restaurar banco somente
  com backup validado e com o serviço em manutenção.

## Ambiente de homologação

No plano gratuito atual é possível ter um ambiente de homologação com custo
zero:

- Neon: criar um branch do banco (ex.: `staging`).
- Render: criar um segundo Web Service apontando para o branch `staging`,
  com `FRONTEND_URL` do preview.
- Vercel: usar Preview Deployments (cada PR gera URL de preview).

O `render.yaml` descreve o serviço principal; para homologação, duplicar o
serviço no painel com outro nome e as variáveis do ambiente de staging.

## Domínio próprio (futuro)

- Vercel: adicionar domínio no painel (DNS CNAME/ALIAS apontando para
  `cname.vercel-dns.com`).
- Render: adicionar domínio customizado no Web Service (SSL automático).
- Atualizar `FRONTEND_URL` no Render e `VITE_API_URL` na Vercel.
- Atualizar as origens autorizadas no Google Cloud Console (origem do
  frontend e redirect URI do OAuth).

## Escala além do plano gratuito

- Render free suspende após inatividade; o primeiro request pode demorar
  (cold start). Migrar para Starter quando o uso justificar.
- Neon free tem limites de armazenamento/compute; monitorar uso e migrar
  para o plano pago antes de estourar.
- Vercel free é suficiente para o MVP; considerar Pro se houver necessidade
  de previews com mais builds ou funcionalidades de edge.
- Adicionar cache HTTP/CDN no frontend e índice na API quando o tráfego
  crescer.
- Considerar fila de jobs (ex.: notificações) fora do request-response.