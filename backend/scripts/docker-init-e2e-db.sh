#!/bin/sh
# Cria o banco isolado de E2E na primeira inicialização do PostgreSQL.
# Seguro por design: só executa em volume novo e só cria 'arenax_e2e'.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE arenax_e2e OWNER ' || quote_ident('$POSTGRES_USER')
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'arenax_e2e')\gexec
EOSQL