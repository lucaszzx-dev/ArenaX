import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
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
    sameSite: "lax" as const,
    secure: options.env.NODE_ENV === "production",
    path: "/"
  };

  app.post("/auth/register", async (request, reply) => {
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

  app.post("/auth/login", async (request, reply) => {
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
    const sessionToken = request.cookies[options.env.SESSION_COOKIE_NAME];

    if (!sessionToken) {
      throw new AppError("Você precisa entrar.", 401, "UNAUTHENTICATED");
    }

    const user = await options.authService.getCurrentUser(sessionToken);

    if (!user) {
      throw new AppError(
        "Sua sessão expirou. Entre novamente.",
        401,
        "SESSION_EXPIRED"
      );
    }

    return { user };
  });
};
