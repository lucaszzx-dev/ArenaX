import { execSync } from "node:child_process";

import { loadE2EEnvFile, requireE2eDatabaseUrl } from "./e2e-env.js";

export default function globalTeardown(): void {
  loadE2EEnvFile();
  const databaseUrl = requireE2eDatabaseUrl();

  console.log(
    `[e2e] globalTeardown: removendo dados E2E residuais do banco isolado (${databaseUrl.replace(/\/\/[^@]+@/, "//***@")})`
  );

  execSync("pnpm exec tsx scripts/e2e-db.ts cleanup", {
    cwd: "backend",
    stdio: "inherit",
    env: process.env
  });
}
