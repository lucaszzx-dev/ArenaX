import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import type { AuthService } from "./auth/auth-service.js";
import type { Env } from "./config/env.js";
import { AppError } from "./errors/app-error.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";

type BuildAppOptions = {
  authService?: AuthService;
  env?: Env;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test"
  });

  app.register(cookie);

  if (options.env) {
    app.register(cors, {
      origin: options.env.FRONTEND_URL,
      credentials: true
    });
  }

  app.register(healthRoutes);

  if (options.authService && options.env) {
    app.register(authRoutes, {
      prefix: "/api",
      authService: options.authService,
      env: options.env
    });
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível concluir a operação."
      }
    });
  });

  return app;
}
