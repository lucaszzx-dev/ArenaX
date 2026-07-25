import type { FastifyRequest } from "fastify";

import type { AuthService } from "./auth-service.js";
import { AppError } from "../errors/app-error.js";

export async function requireUser(
  request: FastifyRequest,
  authService: AuthService,
  sessionCookieName: string
) {
  const sessionToken = request.cookies[sessionCookieName];

  if (!sessionToken) {
    throw new AppError("Você precisa entrar.", 401, "UNAUTHENTICATED");
  }

  const user = await authService.getCurrentUser(sessionToken);

  if (!user) {
    throw new AppError(
      "Sua sessão expirou. Entre novamente.",
      401,
      "SESSION_EXPIRED"
    );
  }

  return user;
}
