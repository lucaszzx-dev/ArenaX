import { randomBytes, timingSafeEqual } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import {
  createGoogleAuthorizationUrl,
  getGoogleProfile,
  type GoogleOAuthConfig
} from "../auth/google-oauth.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128)
});

const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});

type AuthRoutesOptions = {
  authService: AuthService;
  env: Env;
};

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  options
) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: options.env.NODE_ENV === "production"
      ? "none" as const
      : "lax" as const,
    secure: options.env.NODE_ENV === "production",
    path: "/"
  };
  const oauthStateCookie = `${options.env.SESSION_COOKIE_NAME}_oauth_state`;

  function getGoogleConfig(): GoogleOAuthConfig {
    const {
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
      GOOGLE_REDIRECT_URI: redirectUri
    } = options.env;

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri ||
      isGooglePlaceholder(clientId) ||
      isGooglePlaceholder(clientSecret)
    ) {
      throw new AppError(
        "O login com Google ainda não foi configurado.",
        503,
        "GOOGLE_AUTH_NOT_CONFIGURED"
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  const limit = (max: number) => ({
    max: options.env.NODE_ENV === "test" ? 100_000 : max,
    timeWindow: "1 minute" as const
  });

  app.post("/auth/register", {
    config: { rateLimit: limit(30) }
  }, async (request, reply) => {
    const input = registerSchema.safeParse(request.body);

    if (!input.success) {
      throw new AppError(
        "Revise os dados informados.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await options.authService.register(input.data);

    return reply
      .setCookie(options.env.SESSION_COOKIE_NAME, result.sessionToken, {
        ...cookieOptions,
        expires: result.expiresAt
      })
      .status(201)
      .send({ user: result.user });
  });

  app.post("/auth/login", {
    config: { rateLimit: limit(40) }
  }, async (request, reply) => {
    const input = loginSchema.safeParse(request.body);

    if (!input.success) {
      throw new AppError(
        "Revise o e-mail e a senha.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await options.authService.login(input.data);

    return reply
      .setCookie(options.env.SESSION_COOKIE_NAME, result.sessionToken, {
        ...cookieOptions,
        expires: result.expiresAt
      })
      .send({ user: result.user });
  });

  app.post("/auth/logout", async (request, reply) => {
    const sessionToken = request.cookies[options.env.SESSION_COOKIE_NAME];

    if (sessionToken) {
      await options.authService.logout(sessionToken);
    }

    return reply
      .clearCookie(options.env.SESSION_COOKIE_NAME, cookieOptions)
      .status(204)
      .send();
  });

  app.get("/auth/me", async (request) => {
    const user = await requireUser(
      request,
      options.authService,
      options.env.SESSION_COOKIE_NAME
    );

    return { user };
  });

  app.get("/auth/google", {
    config: { rateLimit: limit(60) }
  }, async (_request, reply) => {
    let config: GoogleOAuthConfig;
    try {
      config = getGoogleConfig();
    } catch {
      return reply.redirect(
        options.env.FRONTEND_URL + "/entrar?erro=google_not_configured"
      );
    }
    const state = randomBytes(32).toString("base64url");

    return reply
      .setCookie(oauthStateCookie, state, {
        ...cookieOptions,
        maxAge: 10 * 60
      })
      .redirect(createGoogleAuthorizationUrl(config, state));
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const config = getGoogleConfig();
    const query = googleCallbackSchema.safeParse(request.query);
    const expectedState = request.cookies[oauthStateCookie];

    if (
      !query.success ||
      !expectedState ||
      !safeStateEqual(query.data.state, expectedState)
    ) {
      return reply
        .clearCookie(oauthStateCookie, cookieOptions)
        .redirect(`${options.env.FRONTEND_URL}/entrar?erro=google_state`);
    }

    try {
      const profile = await getGoogleProfile(config, query.data.code);
      const result = await options.authService.loginWithOAuth(profile);

      return reply
        .clearCookie(oauthStateCookie, cookieOptions)
        .setCookie(options.env.SESSION_COOKIE_NAME, result.sessionToken, {
          ...cookieOptions,
          expires: result.expiresAt
        })
        .redirect(`${options.env.FRONTEND_URL}/painel`);
    } catch (error) {
      request.log.error(error);
      return reply
        .clearCookie(oauthStateCookie, cookieOptions)
        .redirect(`${options.env.FRONTEND_URL}/entrar?erro=google`);
    }
  });
};

function isGooglePlaceholder(value: string): boolean {
  return (
    value === "your-google-client-id.apps.googleusercontent.com" ||
    value === "your-google-client-secret" ||
    value.startsWith("your-google-") ||
    value.startsWith("seu-")
  );
}

function safeStateEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
