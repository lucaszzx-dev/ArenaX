import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import { ChampionshipService } from "../src/championships/championship-service.js";
import type { Env } from "../src/config/env.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";

function buildTestApp() {
  const env: Env = {
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 3333,
    DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
    FRONTEND_URL: "http://localhost:5173",
    SESSION_COOKIE_NAME: "arenax_session",
    SESSION_TTL_DAYS: 7
  };
  const app = buildApp({
    authService: new AuthService(new InMemoryAuthRepository(), 7),
    championshipService: new ChampionshipService(
      new InMemoryChampionshipRepository()
    ),
    env
  });
  return app;
}

describe("rate limit handling", () => {
  it("responds 429 with RATE_LIMIT_EXCEEDED instead of 500", async () => {
    const app = buildTestApp();
    app.get("/test-rate-limit", () => {
      const error = new Error("limite atingido") as Error & {
        statusCode?: number;
      };
      error.statusCode = 429;
      throw error;
    });
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/test-rate-limit"
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Muitas tentativas. Aguarde um minuto e tente novamente."
      }
    });

    await app.close();
  });

  it("keeps 401 for unauthenticated championship routes", async () => {
    const app = buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/championships"
    });

    expect(response.statusCode).toBe(401);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("UNAUTHENTICATED");

    await app.close();
  });
});
