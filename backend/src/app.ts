import { randomUUID } from "node:crypto";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import type { AuthService } from "./auth/auth-service.js";
import type { ChampionshipService } from "./championships/championship-service.js";
import type { ParticipantService } from "./participants/participant-service.js";
import type { MatchService } from "./matches/match-service.js";
import type { MatchEventService } from "./match-events/match-event-service.js";
import type { StatisticsService } from "./match-events/statistics-service.js";
import type { MatchPeriodService } from "./match-periods/match-period-service.js";
import type { MatchAuditService } from "./match-audit/match-audit-service.js";
import type { ClubService } from "./clubs/club-service.js";
import type { KnockoutService } from "./knockout/knockout-service.js";
import type { MatchOperationService } from "./match-operations/match-operation-service.js";
import type { PublicProfileService } from "./public-profiles/public-profile-service.js";
import type { NotificationService } from "./notifications/notification-service.js";
import type { Env } from "./config/env.js";
import { AppError } from "./errors/app-error.js";
import { sanitizeLogUrl } from "./observability/sanitize-log-url.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { profileRoutes } from "./routes/profile.js";
import { championshipRoutes } from "./routes/championships.js";
import { participantRoutes } from "./routes/participants.js";
import { matchRoutes } from "./routes/matches.js";
import { matchEventRoutes } from "./routes/match-events.js";
import { matchPeriodRoutes } from "./routes/match-periods.js";
import { publicChampionshipRoutes } from "./routes/public-championships.js";
import { publicStatisticsRoutes } from "./routes/public-statistics.js";
import { adminStatisticsRoutes } from "./routes/admin-statistics.js";
import { clubRoutes } from "./routes/clubs.js";
import { knockoutRoutes } from "./routes/knockout.js";
import { matchOperationRoutes } from "./routes/match-operations.js";
import { publicProfileRoutes } from "./routes/public-profiles.js";
import { notificationRoutes } from "./routes/notifications.js";

type BuildAppOptions = {
  checkDatabase?: () => Promise<void>;
  authService?: AuthService;
  championshipService?: ChampionshipService;
  participantService?: ParticipantService;
  matchService?: MatchService;
  matchEventService?: MatchEventService;
  statisticsService?: StatisticsService;
  matchPeriodService?: MatchPeriodService;
  matchAuditService?: MatchAuditService | undefined;
  clubService?: ClubService;
  knockoutService?: KnockoutService;
  matchOperationService?: MatchOperationService;
  publicProfileService?: PublicProfileService | undefined;
  notificationService?: NotificationService | undefined;
  env?: Env;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    genReqId: () => randomUUID(),
    logger: options.env
      ? options.env.NODE_ENV === "test"
        ? false
        : {
            level: options.env.LOG_LEVEL,
            redact: {
              paths: [
                "req.headers.cookie",
                "req.headers.authorization",
                "req.query.code",
                "req.query.state",
                "req.query.token",
                "req.query.access_token"
              ],
              censor: "[REDACTED]"
            },
            serializers: {
              req: (request) => ({
                method: request.method,
                url: sanitizeLogUrl(request.url),
                host: request.host,
                remoteAddress: request.ip,
                remotePort: request.socket?.remotePort ?? 0
              })
            }
          }
      : process.env.NODE_ENV !== "test",
    trustProxy: options.env?.NODE_ENV === "production"
  });

  app.register(cookie);
  const rateLimitMax = options.env?.NODE_ENV === "test" ? 100_000 : 600;
  app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Muitas tentativas. Aguarde um minuto e tente novamente."
      }
    })
  });

  if (options.env) {
    app.register(cors, {
      origin: options.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"]
    });
  }
  if (options.env) {
    const allowedOrigin = new URL(options.env.FRONTEND_URL).origin;
    app.addHook("onRequest", async (request, reply) => {
      if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
      const origin = request.headers.origin;
      if (!origin) return;
      let requestOrigin: string;
      try {
        requestOrigin = new URL(origin).origin;
      } catch {
        return reply.status(403).send({
          error: { code: "FORBIDDEN_ORIGIN", message: "Origem não autorizada." }
        });
      }
      if (requestOrigin !== allowedOrigin) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN_ORIGIN", message: "Origem não autorizada." }
        });
      }
    });
  }

  if (options.checkDatabase) {
    app.register(healthRoutes, { checkDatabase: options.checkDatabase });
  } else {
    app.register(healthRoutes);
  }

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

  if (options.authService && options.clubService && options.env) {
    app.register(clubRoutes, {
      prefix: "/api",
      authService: options.authService,
      clubService: options.clubService,
      env: options.env
    });
  }

  if (options.authService && options.knockoutService && options.env) {
    app.register(knockoutRoutes, {
      prefix: "/api",
      authService: options.authService,
      knockoutService: options.knockoutService,
      env: options.env
    });
  }

  if (options.authService && options.matchOperationService && options.env) {
    app.register(matchOperationRoutes, {
      prefix: "/api",
      authService: options.authService,
      service: options.matchOperationService,
      env: options.env
    });
  }

  if (options.authService && options.matchService && options.env) {
    app.register(matchRoutes, {
      prefix: "/api",
      authService: options.authService,
      matchService: options.matchService,
      matchAuditService: options.matchAuditService,
      env: options.env
    });
  }

  if (options.authService && options.matchEventService && options.env) {
    app.register(matchEventRoutes, {
      prefix: "/api",
      authService: options.authService,
      matchEventService: options.matchEventService,
      env: options.env
    });
  }

  if (options.authService && options.statisticsService && options.env) {
    app.register(adminStatisticsRoutes, {
      prefix: "/api",
      authService: options.authService,
      statisticsService: options.statisticsService,
      env: options.env
    });
  }

  if (options.authService && options.matchPeriodService && options.env) {
    app.register(matchPeriodRoutes, {
      prefix: "/api",
      authService: options.authService,
      matchPeriodService: options.matchPeriodService,
      env: options.env
    });
  }

  if (options.championshipService && options.matchService) {
    app.register(publicChampionshipRoutes, {
      prefix: "/api",
      championshipService: options.championshipService,
      matchService: options.matchService,
      matchEventService: options.matchEventService,
      matchPeriodService: options.matchPeriodService,
      participantService: options.participantService,
      matchOperationService: options.matchOperationService
    });
    app.register(publicStatisticsRoutes, {
      prefix: "/api",
      championshipService: options.championshipService,
      statisticsService: options.statisticsService
    });
  }

  if (options.authService && options.notificationService && options.env) {
    app.register(notificationRoutes, {
      prefix: "/api",
      authService: options.authService,
      notificationService: options.notificationService,
      env: options.env
    });
  }

  if (options.publicProfileService) {
    app.register(publicProfileRoutes, {
      prefix: "/api",
      publicProfileService: options.publicProfileService
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

    const statusCode =
      typeof error === "object" && error !== null &&
      "statusCode" in error && typeof error.statusCode === "number"
        ? Math.max(400, error.statusCode)
        : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error, requestId: request.id }, "unhandled error");
    }

    if (statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Muitas tentativas. Aguarde um minuto e tente novamente."
        }
      });
    }

    return reply.status(statusCode).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível concluir a operação.",
        requestId: request.id
      }
    });
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.method === "OPTIONS") {
      return reply.status(204).send();
    }
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Endereço não encontrado."
      }
    });
  });
  return app;
}


