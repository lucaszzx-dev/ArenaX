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

async function registerAndGetCookie() {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      displayName: "Perfil Original",
      email: `profile-${crypto.randomUUID()}@arenax.test`,
      password: "senha-segura"
    }
  });
  const sessionCookie = response.cookies.find(
    (cookie) => cookie.name === env.SESSION_COOKIE_NAME
  );

  if (!sessionCookie) {
    throw new Error("Cookie de sessão não foi criado.");
  }

  return `${sessionCookie.name}=${sessionCookie.value}`;
}

describe("profile routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects profile access without a session", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/profile"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "UNAUTHENTICATED"
      }
    });
  });

  it("updates only the authenticated user's profile", async () => {
    const cookie = await registerAndGetCookie();
    const response = await app.inject({
      method: "PUT",
      url: "/api/profile",
      headers: { cookie },
      payload: {
        displayName: "Capitã da Arena",
        avatarUrl: "https://example.com/avatar.png",
        bio: "Organizadora de campeonatos amadores."
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        displayName: "Capitã da Arena",
        avatarUrl: "https://example.com/avatar.png",
        bio: "Organizadora de campeonatos amadores."
      }
    });
  });

  it("does not accept invalid profile data", async () => {
    const cookie = await registerAndGetCookie();
    const response = await app.inject({
      method: "PUT",
      url: "/api/profile",
      headers: { cookie },
      payload: {
        displayName: "",
        avatarUrl: "not-a-url",
        bio: "a".repeat(241)
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR"
      }
    });
  });
});
