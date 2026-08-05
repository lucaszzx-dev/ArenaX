import { defineConfig, devices } from "@playwright/test";

import {
  E2E_BACKEND_URL,
  E2E_DATABASE_NAME,
  E2E_FRONTEND_URL,
  loadE2EEnvFile,
  parseDatabaseName,
  requireE2eDatabaseUrl
} from "./e2e/e2e-env.js";

loadE2EEnvFile();

// URL do banco E2E isolado. O padrão local usa o PostgreSQL do compose
// (arenax/arenax_dev), mas o banco é sempre 'arenax_e2e' — diferente do
// banco de desenvolvimento 'arenax'. Para sobrescrever, defina
// E2E_DATABASE_URL no ambiente antes de rodar os testes.
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://arenax:arenax_dev@localhost:5432/arenax_e2e";

// A validação abaixo garante estruturalmente que o E2E nunca aponta para o
// banco de desenvolvimento/produção, mesmo com variáveis externas.
if (parseDatabaseName(e2eDatabaseUrl) !== E2E_DATABASE_NAME) {
  throw new Error(
    `E2E_DATABASE_URL deve apontar para o banco isolado '${E2E_DATABASE_NAME}'.`
  );
}

// O backend só lê DATABASE_URL; expor também E2E_DATABASE_URL para que
// globalSetup/teardown e scripts de banco usem a mesma URL explícita.
process.env.E2E_DATABASE_URL = e2eDatabaseUrl;
process.env.DATABASE_URL = e2eDatabaseUrl;
requireE2eDatabaseUrl();

const backendPort = new URL(E2E_BACKEND_URL).port;
const backendEnv = {
  ...process.env,
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: backendPort,
  DATABASE_URL: e2eDatabaseUrl,
  E2E_DATABASE_URL: e2eDatabaseUrl,
  FRONTEND_URL: E2E_FRONTEND_URL,
  LOG_LEVEL: "warn"
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: E2E_FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ],
  webServer: [
    {
      command: "pnpm --dir backend build && pnpm --dir backend start",
      url: `${E2E_BACKEND_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: backendEnv
    },
    {
      command: "pnpm --dir frontend dev",
      url: E2E_FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_API_URL: `${E2E_BACKEND_URL}/api`
      }
    }
  ]
});
