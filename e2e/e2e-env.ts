import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export const E2E_DATABASE_NAME = "arenax_e2e";
export const E2E_FRONTEND_URL = "http://localhost:5173";
export const E2E_BACKEND_URL = "http://localhost:3333";

export function loadE2EEnvFile(): void {
  const file = ".env.e2e";
  if (existsSync(file)) {
    loadEnvFile(file);
  }
}

export function parseDatabaseName(databaseUrl: string): string {
  return new URL(databaseUrl).pathname.replace(/^\//, "");
}

export function requireE2eDatabaseUrl(
  source: NodeJS.ProcessEnv = process.env
): string {
  const databaseUrl = source.E2E_DATABASE_URL ?? source.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL não definida. Defina E2E_DATABASE_URL (ou DATABASE_URL) apontando para o banco isolado 'arenax_e2e'."
    );
  }

  const databaseName = parseDatabaseName(databaseUrl);
  if (databaseName !== E2E_DATABASE_NAME) {
    throw new Error(
      "Os testes E2E exigem um banco isolado chamado '" +
        E2E_DATABASE_NAME +
        "', mas DATABASE_URL aponta para '" +
        databaseName +
        "'. Nunca execute E2E contra o banco de desenvolvimento ou produção."
    );
  }

  return databaseUrl;
}
