import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import type { Env } from "../src/config/env.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";

const repository = new InMemoryAuthRepository();
const authService = new AuthService(repository, 7);
const env: Env = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3333,
  DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_COOKIE_NAME: "arenax_session",
  SESSION_TTL_DAYS: 7
};
const app = buildApp({ authService, env });

describe("auth routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a user and sets an HttpOnly session cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        displayName: "Capitã Aurora",
        email: "aurora@arenax.test",
        password: "senha-segura"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.cookies[0]).toMatchObject({
      name: "arenax_session",
      httpOnly: true,
      sameSite: "Lax"
    });
    expect(response.json()).toMatchObject({
      user: {
        displayName: "Capitã Aurora",
        email: "aurora@arenax.test"
      }
    });
  });

  it("returns a clear validation error", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        displayName: "",
        email: "email-invalido",
        password: "123"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Revise os dados informados."
      }
    });
  });

  it("explains when Google login credentials are not configured", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/google"
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "GOOGLE_AUTH_NOT_CONFIGURED",
        message: "O login com Google ainda não foi configurado."
      }
    });
  });
});
