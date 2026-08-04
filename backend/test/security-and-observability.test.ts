import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import type { Env } from "../src/config/env.js";
import { sanitizeLogUrl } from "../src/observability/sanitize-log-url.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";

const env: Env = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3333,
  DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_COOKIE_NAME: "arenax_session",
  SESSION_TTL_DAYS: 7
};

const app = buildApp({ env, authService: new AuthService(new InMemoryAuthRepository(), 7) });

describe("sanitizeLogUrl", () => {
  it("redacts OAuth code and state from query strings", () => {
    const sanitized = sanitizeLogUrl(
      "/api/auth/google/callback?code=abc123&state=xyz&prompt=select_account"
    );
    expect(sanitized).toBe(
      "/api/auth/google/callback?code=[REDACTED]&state=[REDACTED]&prompt=select_account"
    );
    expect(sanitized).not.toContain("abc123");
    expect(sanitized).not.toContain("xyz");
  });

  it("redacts tokens and leaves ordinary query params intact", () => {
    const sanitized = sanitizeLogUrl(
      "/api/x?access_token=secret-token&page=2&token=another"
    );
    expect(sanitized).toBe("/api/x?access_token=[REDACTED]&page=2&token=[REDACTED]");
  });

  it("keeps urls without sensitive params unchanged", () => {
    expect(sanitizeLogUrl("/api/championships/abc/matches")).toBe(
      "/api/championships/abc/matches"
    );
  });
});

describe("security and observability", () => {
  beforeAll(async () => {
    app.get("/__boom", async () => {
      throw new Error("segredo interno: stack trace nao deve vazar");
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns a safe 500 without leaking the stack trace", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/__boom"
    });

    expect(response.statusCode).toBe(500);
    const body = response.json<{ error: { code: string; message: string; requestId?: string } }>();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.message).not.toContain("segredo interno");
    expect(body.error.message).not.toContain("at ");
    expect(typeof body.error.requestId).toBe("string");
  });

  it("returns a consistent JSON 404 without leaking the route path", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/rota-inexistente"
    });

    expect(response.statusCode).toBe(404);
    const body = response.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).not.toContain("rota-inexistente");
  });

  it("keeps AppError code and status intact", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { displayName: "x", email: "invalido", password: "12345678" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  it("rejects non-GET requests from disallowed origins", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: "https://evil.example" },
      payload: { email: "a@b.com", password: "12345678" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: { code: "FORBIDDEN_ORIGIN" }
    });
  });

  it("allows GET requests from any origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://evil.example" }
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns OPTIONS 204 for unknown routes", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/rota-inexistente",
      headers: { origin: env.FRONTEND_URL, "access-control-request-method": "POST" }
    });

    expect(response.statusCode).toBe(204);
  });
});