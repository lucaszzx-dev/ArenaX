import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import type { Env } from "../src/config/env.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import { trustedDeviceCookieOptions } from "../src/auth/trusted-device-cookie.js";
import type { LoginVerificationEmail } from "../src/email/email-provider.js";

const repository = new InMemoryAuthRepository();
const loginVerificationEmails: LoginVerificationEmail[] = [];
const authService = new AuthService(repository, 7, {
  sendPasswordReset: async () => {},
  sendLoginVerification: async (email) => { loginVerificationEmails.push(email); }
});
const env: Env = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3333,
  DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_COOKIE_NAME: "arenax_session",
  SESSION_TTL_DAYS: 7,
  TRUSTED_DEVICE_COOKIE_NAME: "arenax_trusted_device",
  TRUSTED_DEVICE_TTL_DAYS: 30
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

  it("returns 401 from /auth/me without a session cookie", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Você precisa entrar."
      }
    });
  });

  it("returns the current user from /auth/me with a valid cookie", async () => {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        displayName: "Me De Novo",
        email: "me2@arenax.test",
        password: "senha-segura"
      }
    });
    const sessionCookie = registerResponse.cookies.find(
      (cookie) => cookie.name === "arenax_session"
    );
    expect(sessionCookie).toBeDefined();

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie: "arenax_session=" + sessionCookie!.value
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        displayName: "Me De Novo",
        email: "me2@arenax.test"
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

  it("redirects to the login page when Google credentials are not configured", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/google"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("/entrar?erro=google_not_configured");
  });

  it("keeps the normal session cookie and clears the separate trusted-device cookie on logout", async () => {
    const registered = await app.inject({
      method: "POST", url: "/api/auth/register",
      payload: { displayName: "Logout Seguro", email: "logout@arenax.test", password: "senha-segura" }
    });
    const session = registered.cookies.find((item) => item.name === env.SESSION_COOKIE_NAME)!;
    const response = await app.inject({
      method: "POST", url: "/api/auth/logout",
      headers: { cookie: `${env.SESSION_COOKIE_NAME}=${session.value}` }
    });

    expect(response.statusCode).toBe(204);
    expect(response.cookies).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: env.SESSION_COOKIE_NAME, httpOnly: true, sameSite: "Lax" }),
      expect.objectContaining({ name: env.TRUSTED_DEVICE_COOKIE_NAME, httpOnly: true, sameSite: "Lax" })
    ]));
  });

  it("defines a separate trusted-device cookie with the expected security properties", () => {
    expect(trustedDeviceCookieOptions(env)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60
    });
    expect(trustedDeviceCookieOptions({ ...env, NODE_ENV: "production" })).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
  });

  it("does not create a session before login verification and sets session and trust cookies after it", async () => {
    const email = "verify-route@arenax.test";
    await app.inject({ method: "POST", url: "/api/auth/register", payload: { displayName: "Verifica Rota", email, password: "senha-segura" } });
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: "senha-segura" } });
    expect(login.statusCode).toBe(202);
    expect(login.cookies.find((cookie) => cookie.name === env.SESSION_COOKIE_NAME)).toBeUndefined();
    const challengeToken = login.json<{ challengeToken: string }>().challengeToken;
    const verify = await app.inject({ method: "POST", url: "/api/auth/login/verify", payload: { challengeToken, code: loginVerificationEmails.at(-1)!.code } });
    expect(verify.statusCode).toBe(200);
    expect(verify.cookies).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: env.SESSION_COOKIE_NAME, httpOnly: true }),
      expect.objectContaining({ name: env.TRUSTED_DEVICE_COOKIE_NAME, httpOnly: true })
    ]));
    const cookies = verify.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie: cookies } });
    expect(logout.statusCode).toBe(204);
  });
});
