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
import { trustedDeviceCookieName, trustedDeviceCookieOptions } from "../auth/trusted-device-cookie.js";

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128)
});

const resetRequestSchema = z.object({ email: z.email().max(254) });
const resetVerifySchema = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/)
});
const resetPasswordSchema = z.object({
  email: z.email().max(254),
  verificationToken: z.string().min(32).max(256),
  password: z.string().min(8).max(128)
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
  const trustedDeviceCookieNameForEnv = trustedDeviceCookieName(options.env);
  const trustedDeviceCookieOptionsForEnv = trustedDeviceCookieOptions(options.env);

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

  app.post("/auth/password-reset/request", {
    config: { rateLimit: limit(5) }
  }, async (request, reply) => {
    const input = resetRequestSchema.safeParse(request.body);
    // A neutral response prevents account enumeration, including malformed bodies.
    if (input.success) await options.authService.requestPasswordReset(input.data.email);
    return reply.status(202).send({ message: "Se existir uma conta para este e-mail, enviaremos um codigo." });
  });

  app.post("/auth/password-reset/verify", {
    config: { rateLimit: limit(10) }
  }, async (request) => {
    const input = resetVerifySchema.safeParse(request.body);
    if (!input.success) throw new AppError("Codigo invalido ou expirado.", 400, "INVALID_RESET_CODE");
    const verificationToken = await options.authService.verifyPasswordReset(input.data.email, input.data.code);
    return { verificationToken };
  });

  app.post("/auth/password-reset/confirm", {
    config: { rateLimit: limit(10) }
  }, async (request, reply) => {
    const input = resetPasswordSchema.safeParse(request.body);
    if (!input.success) throw new AppError("Revise os dados informados.", 400, "VALIDATION_ERROR");
    await options.authService.resetPassword(input.data.email, input.data.verificationToken, input.data.password);
    return reply.status(204).send();
  });

  app.post("/auth/logout", async (request, reply) => {
    const sessionToken = request.cookies[options.env.SESSION_COOKIE_NAME];
    const trustedDeviceToken = request.cookies[trustedDeviceCookieNameForEnv];

    if (sessionToken) {
      await options.authService.logout(sessionToken);
    }
    if (trustedDeviceToken) {
      await options.authService.revokeCurrentTrustedDevice(trustedDeviceToken);
    }

    return reply
      .clearCookie(options.env.SESSION_COOKIE_NAME, cookieOptions)
      .clearCookie(trustedDeviceCookieNameForEnv, trustedDeviceCookieOptionsForEnv)
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
