import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

import { createDatabase } from "../src/db/client.js";

const E2E_DATABASE_NAME = "arenax_e2e";
const E2E_PATTERNS = ["Mata-mata E2E %", "Liga E2E %"];

function databaseUrlFromEnv(): string {
  const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "E2E_DATABASE_URL (ou DATABASE_URL) não definida para o script de banco."
    );
  }
  return url;
}

function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

function requireE2eDatabase(url: string): string {
  const name = databaseName(url);
  if (name !== E2E_DATABASE_NAME) {
    throw new Error(
      `Operação E2E exige o banco '${E2E_DATABASE_NAME}', mas a URL aponta para '${name}'. Abortando para proteger o banco de desenvolvimento.`
    );
  }
  return url;
}

async function ensureDatabase(url: string): Promise<void> {
  requireE2eDatabase(url);
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  try {
    await client.connect();
    const { rows } = await client.query(
      "select datname from pg_database where datname = $1",
      [E2E_DATABASE_NAME]
    );
    if (rows.length === 0) {
      await client.query(`create database "${E2E_DATABASE_NAME}"`);
      console.log(`[e2e-db] banco criado: ${E2E_DATABASE_NAME}`);
    } else {
      console.log(`[e2e-db] banco já existe: ${E2E_DATABASE_NAME}`);
    }
  } finally {
    await client.end();
  }
}

async function resetDatabase(url: string): Promise<void> {
  requireE2eDatabase(url);
  const database = createDatabase(url);
  try {
    // Dropa também o schema 'drizzle' (controle de migrations) para que o
    // reset seja completo e todas as migrations sejam reaplicadas.
    await database.db.execute(sql`drop schema if exists public cascade`);
    await database.db.execute(sql`drop schema if exists drizzle cascade`);
    await database.db.execute(sql`create schema public`);
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    console.log(
      `[e2e-db] schema '${E2E_DATABASE_NAME}' recriado e migrations aplicadas.`
    );
  } finally {
    await database.close();
  }
}

async function cleanupE2eData(url: string): Promise<void> {
  requireE2eDatabase(url);
  const database = createDatabase(url);
  try {
    const listed = await database.db.execute(sql`
      select id, name, slug from championships
      where name like 'Mata-mata E2E %' or name like 'Liga E2E %'
      order by name
    `);
    const rows = listed.rows ?? [];
    console.log(
      `[e2e-db] cleanup: ${rows.length} competição(ões) E2E encontrada(s) no banco '${E2E_DATABASE_NAME}'.`
    );
    for (const row of rows) {
      console.log(`[e2e-db]   - ${String(row.name)} (${String(row.slug)})`);
    }
    if (rows.length > 0) {
      const deleted = await database.db.execute(sql`
        delete from championships
        where name like 'Mata-mata E2E %' or name like 'Liga E2E %'
      `);
      console.log(
        `[e2e-db] cleanup: removidas ${deleted.rowCount} competição(ões) E2E.`
      );
    }
  } finally {
    await database.close();
  }
}

async function legacyCleanup(url: string, apply: boolean): Promise<void> {
  const name = databaseName(url);
  const patterns = E2E_PATTERNS.map((pattern) => `'${pattern}'`).join(", ");
  const database = createDatabase(url);
  try {
    const listed = await database.db.execute(sql`
      select c.id, c.name, c.slug, u.email as organizer
      from championships c
      join users u on u.id = c.organizer_id
      where c.name like 'Mata-mata E2E %' or c.name like 'Liga E2E %'
      order by c.name
    `);
    const rows = listed.rows ?? [];
    console.log(
      `[e2e-db] legacy-cleanup no banco '${name}': ${rows.length} competição(ões) com padrão E2E (${patterns}).`
    );
    for (const row of rows) {
      console.log(
        `[e2e-db]   - ${String(row.name)} (${String(row.slug)}) — organizador ${String(row.organizer)}`
      );
    }
    if (rows.length === 0) {
      console.log("[e2e-db] Nada a remover.");
      return;
    }
    if (!apply) {
      console.log(
        "[e2e-db] Modo listagem: nenhuma exclusão executada. Reexecute com --apply para remover explicitamente."
      );
      return;
    }
    const deleted = await database.db.execute(sql`
      delete from championships
      where name like 'Mata-mata E2E %' or name like 'Liga E2E %'
    `);
    console.log(
      `[e2e-db] legacy-cleanup: removidas ${deleted.rowCount} competição(ões) E2E do banco '${name}'.`
    );
  } finally {
    await database.close();
  }
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const url = databaseUrlFromEnv();

  switch (command) {
    case "ensure":
      await ensureDatabase(url);
      break;
    case "reset":
      await resetDatabase(url);
      break;
    case "cleanup":
      await cleanupE2eData(url);
      break;
    case "legacy-cleanup": {
      const apply = args.includes("--apply");
      await legacyCleanup(url, apply);
      break;
    }
    default:
      console.error(
        "Uso: tsx scripts/e2e-db.ts <ensure|reset|cleanup|legacy-cleanup [--apply]>"
      );
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
