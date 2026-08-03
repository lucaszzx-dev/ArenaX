# Backup e restauração

Última revisão: 2 de agosto de 2026.

O banco de dados do ArenaX é PostgreSQL (local via Docker em desenvolvimento,
Neon em produção). Este guia cobre backup e restauração usando as ferramentas
padrão `pg_dump` e `pg_restore`.

## Backup lógico completo

```bash
# Desenvolvimento (Docker)
pg_dump "postgresql://arenax:secret@localhost:5432/arenax" \
  --format=custom --file=backup-$(date +%F).dump

# Produção (Neon)
pg_dump "$DATABASE_URL" \
  --format=custom --file=backup-$(date +%F).dump
```

O formato `custom` é comprimido e permite restaurar seletivamente. Guarde o
arquivo fora do mesmo host do banco (bucket S3, drive, etc.) e teste a
restauração periodicamente.

## Restauração

```bash
# Recria o banco vazio (se necessário)
createdb "postgresql://arenax:secret@localhost:5432/arenax"

# Restaura o dump
pg_restore --clean --if-exists --no-owner \
  --dbname "postgresql://arenax:secret@localhost:5432/arenax" \
  backup-$(date +%F).dump
```

Em produção, faça a restauração em um banco novo antes de substituir o atual e
confira as migrações (`pnpm --dir backend run db:migrate`) após restaurar.

## Rotina recomendada

- Backup diário automático (cron ou serviço da hospedagem).
- Retenção mínima de 7 dias.
- Teste de restauração mensal em ambiente de staging.
- Antes de qualquer migração destrutiva, faça um backup e valide o dump.

## Migrações

O histórico vive em `backend/drizzle` e é aplicado com:

```bash
pnpm --dir backend run db:migrate
```

Nunca edite migrações já aplicadas em produção; crie uma nova migração.