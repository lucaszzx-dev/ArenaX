import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import type { AuthService } from "./auth/auth-service.js";
import type { ChampionshipService } from "./championships/championship-service.js";
import type { ParticipantService } from "./participants/participant-service.js";
import type { MatchService } from "./matches/match-service.js";
import type { Env } from "./config/env.js";
import { AppError } from "./errors/app-error.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { profileRoutes } from "./routes/profile.js";
import { championshipRoutes } from "./routes/championships.js";
import { participantRoutes } from "./routes/participants.js";
import { matchRoutes } from "./routes/matches.js";
import { publicChampionshipRoutes } from "./routes/public-championships.js";

type BuildAppOptions = {
  authService?: AuthService;
  championshipService?: ChampionshipService;
  participantService?: ParticipantService;
  matchService?: MatchService;
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
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"]
    });
  }

  app.register(healthRoutes);

  if (options.authService && options.env) {
    app.register(authRoutes, {
      prefix: "/api",
      authService: options.authService,
      env: options.env
    });
    app.register(profileRoutes, {
      prefix: "/api",
      authService: options.authService,
      env: options.env
    });
  }

  if (options.authService && options.championshipService && options.env) {
    app.register(championshipRoutes, {
      prefix: "/api",
      authService: options.authService,
      championshipService: options.championshipService,
      env: options.env
    });
  }

  if (options.authService && options.participantService && options.env) {
    app.register(participantRoutes, {
      prefix: "/api",
      authService: options.authService,
      participantService: options.participantService,
      env: options.env
    });
  }

  if (options.authService && options.matchService && options.env) {
    app.register(matchRoutes, {
      prefix: "/api",
      authService: options.authService,
      matchService: options.matchService,
      env: options.env
    });
  }

  if (options.championshipService && options.matchService) {
    app.register(publicChampionshipRoutes, {
      prefix: "/api",
      championshipService: options.championshipService,
      matchService: options.matchService
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
