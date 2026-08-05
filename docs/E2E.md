# Testes E2E e isolamento de banco

Última revisão: 5 de agosto de 2026.

## Banco E2E isolado

Os testes Playwright **nunca** usam o banco de desenvolvimento. Eles usam um
banco separado chamado `arenax_e2e` no mesmo PostgreSQL local.

```text
arenax      -> desenvolvimento normal
arenax_e2e  -> Playwright/E2E (sempre isolado)
```

A separação é estrutural:

- o `playwright.config.ts` injeta `DATABASE_URL` e `E2E_DATABASE_URL`
  apontando sempre para `arenax_e2e` nos processos do backend;
- o config valida o **nome** do banco antes de qualquer teste: se a URL não
  terminar em `/arenax_e2e`, o Playwright aborta;
- `reuseExistingServer: false` impede reutilizar backend/frontend já abertos
  (que apontariam para o banco de desenvolvimento);
- o global setup cria o banco (`ensure`), reseta o schema e aplica todas as
  migrations (`reset`), e roda o seed demo (`db:seed`);
- o global teardown remove competições E2E residuais do `arenax_e2e`.

## Como executar

Pré-requisitos: Docker Desktop (ou PostgreSQL local na porta 5432) com o
usuário `arenax`/senha `arenax_dev` e Node/pnpm instalados.

```bash
# 1. Suba o PostgreSQL (na primeira vez cria arenax e arenax_e2e)
docker compose up -d

# 2. Instale dependências e navegador (uma vez)
pnpm install
pnpm exec playwright install chromium

# 3. Rode a suíte (desktop + mobile = 26 testes)
pnpm test:e2e

# Apenas desktop (usado no CI)
pnpm test:e2e -- --project=chromium
```

O comando `pnpm test:e2e`:

1. valida que a URL aponta para `arenax_e2e` (aborta se apontar para outro banco);
2. cria o banco `arenax_e2e` se não existir;
3. recria o schema e aplica as migrations;
4. roda o seed demonstrativo (idempotente);
5. sobe backend (`:3333`) e frontend (`:5173`) dedicados aos testes;
6. executa os 26 testes e remove competições E2E residuais ao final.

> Atenção: se você já tiver o backend/frontend de desenvolvimento rodando nas
> portas 3333/5173, os testes E2E falham ao iniciar (a porta já está em uso).
> Pare os servidores de desenvolvimento antes de rodar `pnpm test:e2e`.

## Requisitos Docker/PostgreSQL

- `compose.yaml` usa `postgres:17-alpine` e cria as duas bases na primeira
  subida (`arenax` e `arenax_e2e`) via
  `backend/scripts/docker-init-e2e-db.sh`.
- Em um PostgreSQL já existente, crie o banco E2E manualmente:

  ```bash
  pnpm --dir backend exec tsx scripts/e2e-db.ts ensure
  ```

- Configuração alternativa via arquivo `.env.e2e` (não versionado):

  ```bash
  Copy-Item .env.e2e.example .env.e2e
  ```

  O banco **sempre** precisa se chamar `arenax_e2e`.

## Migrations e seed

- Migrations: aplicadas automaticamente pelo global setup ao banco E2E.
  Manualmente: `pnpm --dir backend db:e2e reset`.
- Seed demonstrativo: `pnpm --dir backend db:seed` (com `DATABASE_URL` do E2E)
  ou automaticamente pelo global setup. O seed é idempotente: rodar de novo
  nunca duplica a "Copa ArenaX Demo" e não apaga dados normais.

## Scripts de banco E2E (`backend/scripts/e2e-db.ts`)

Todos os comandos exigem `DATABASE_URL`/`E2E_DATABASE_URL` apontando para
`arenax_e2e`; caso contrário abortam (proteção contra banco errado).

```bash
# Garante que o banco E2E existe (cria se necessário)
pnpm --dir backend db:e2e ensure

# Recria schema + aplica todas as migrations (destrutivo apenas no E2E)
pnpm --dir backend db:e2e reset

# Remove competições "Mata-mata E2E *" / "Liga E2E *" do banco E2E
pnpm --dir backend db:e2e cleanup

# Lista competições E2E históricas do banco apontado (sem excluir)
pnpm --dir backend db:e2e legacy-cleanup

# Lista e remove explicitamente (usar com DATABASE_URL do banco dev)
pnpm --dir backend db:e2e legacy-cleanup --apply
```

## Dados E2E antigos no banco de desenvolvimento

Versões antigas dos testes criavam competições no banco `arenax`. Para limpar
com segurança:

1. Liste primeiro (não altera nada):

   ```powershell
   $env:DATABASE_URL="postgresql://arenax:arenax_dev@localhost:5432/arenax"
   pnpm --dir backend db:e2e legacy-cleanup
   ```

2. Confira que apenas registros com nome `Mata-mata E2E *` ou `Liga E2E *`
   foram listados e que todos pertencem ao usuário demo.

3. Remova explicitamente:

   ```powershell
   $env:DATABASE_URL="postgresql://arenax:arenax_dev@localhost:5432/arenax"
   pnpm --dir backend db:e2e legacy-cleanup --apply
   ```

A exclusão é limitada ao padrão exato dos testes (`Mata-mata E2E %` e
`Liga E2E %`). A "Copa ArenaX Demo", competições normais, usuários e clubes
não são tocados. Em dúvida, não use `--apply` e limpe manualmente via SQL.

## Diagnosticando falhas

- **`E2E_DATABASE_URL deve apontar para o banco isolado 'arenax_e2e'`**:
  o config abortou porque a URL aponta para outro banco. Confira o `.env.e2e`
  ou a variável de ambiente.
- **Porta 3333/5173 em uso**: pare os servidores de desenvolvimento antes de
  rodar os E2E (eles usam as mesmas portas com `reuseExistingServer: false`).
- **`relation "..." does not exist` no seed**: o reset não foi aplicado.
  Rode `pnpm --dir backend db:e2e reset` e repita.
- **Banco indisponível**: confirme `docker compose up -d` e o healthcheck.
- Relatório HTML gerado em `playwright-report/`; traces em `test-results/`.
