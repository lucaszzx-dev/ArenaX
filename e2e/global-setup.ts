import { execSync } from "node:child_process";

import {
  loadE2EEnvFile,
  parseDatabaseName,
  requireE2eDatabaseUrl
} from "./e2e-env.js";

export default function globalSetup(): void {
  loadE2EEnvFile();
  const databaseUrl = requireE2eDatabaseUrl();
  const databaseName = parseDatabaseName(databaseUrl);

  console.log(
    `[e2e] globalSetup: banco isolado '${databaseName}' (${databaseUrl.replace(/\/\/[^@]+@/, "//***@")})`
  );

  // 1. Garante que o banco E2E existe (nunca dropa nada fora de 'arenax_e2e').
  execSync("pnpm exec tsx scripts/e2e-db.ts ensure", {
    cwd: "backend",
    stdio: "inherit",
    env: process.env
  });

  // 2. Reseta o banco E2E: recria schema e aplica todas as migrations.
  execSync("pnpm exec tsx scripts/e2e-db.ts reset", {
    cwd: "backend",
    stdio: "inherit",
    env: process.env
  });

  // 3. Seed demonstrativo determinístico (idempotente) no banco E2E.
  execSync("pnpm --dir backend run db:seed", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env
  });
}
