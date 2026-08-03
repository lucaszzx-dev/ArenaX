import type { FastifyPluginAsync } from "fastify";
import { z, type ZodType } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { StatisticsService } from "../match-events/statistics-service.js";

const championshipParams = z.object({ id: z.uuid() });
const headToHeadParams = championshipParams.extend({
  entryAId: z.uuid(),
  entryBId: z.uuid()
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  teamId: z.uuid().optional(),
  playerId: z.uuid().optional()
});
const sportQuery = z.object({
  sport: z.string().trim().max(40).optional()
});

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
  }
  return result.data;
}

type AdminStatisticsRoutesOptions = {
  authService: AuthService;
  statisticsService: StatisticsService;
  env: Env;
};

export const adminStatisticsRoutes: FastifyPluginAsync<
  AdminStatisticsRoutesOptions
> = async (app, options) => {
  const getUser = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/championships/:id/statistics", async (request) => {
    const user = await getUser(request);
    const params = parse(championshipParams, request.params);
    const query = parse(pageQuery.extend(sportQuery.shape), request.query);
    const result = await options.statisticsService.statistics(
      params.id,
      { sport: query.sport, teamId: query.teamId, playerId: query.playerId },
      query.page,
      query.limit,
      user.id
    );
    return { statistics: result.items, ...result };
  });

  app.get("/championships/:id/statistics/standings", async (request) => {
    const user = await getUser(request);
    const params = parse(championshipParams, request.params);
    const query = parse(z.object({ teamId: z.uuid().optional() }), request.query);
    const rows = await options.statisticsService.clubStandings(params.id, {
      teamId: query.teamId
    }, user.id);
    return { items: rows, total: rows.length };
  });

  app.get("/championships/:id/statistics/streaks", async (request) => {
    const user = await getUser(request);
    const params = parse(championshipParams, request.params);
    const query = parse(z.object({ teamId: z.uuid().optional() }), request.query);
    const rows = await options.statisticsService.streakStats(params.id, {
      teamId: query.teamId
    }, user.id);
    return { items: rows, total: rows.length };
  });

  app.get("/championships/:id/statistics/head-to-head/:entryAId/:entryBId", async (request) => {
    const user = await getUser(request);
    const params = parse(headToHeadParams, request.params);
    const rows = await options.statisticsService.headToHead(
      params.id,
      params.entryAId,
      params.entryBId,
      user.id
    );
    return {
      entryAId: params.entryAId,
      entryBId: params.entryBId,
      items: rows,
      total: rows.length
    };
  });

  app.get("/championships/:id/statistics/highlights", async (request) => {
    const user = await getUser(request);
    const params = parse(championshipParams, request.params);
    const query = parse(sportQuery, request.query);
    const items = await options.statisticsService.highlights(params.id, {
      sport: query.sport
    }, user.id);
    return { items, total: items.length };
  });

  app.get("/championships/:id/statistics/rankings/:kind", async (request) => {
    const user = await getUser(request);
    const params = parse(
      championshipParams.extend({
        kind: z.enum(["scorer", "aces", "blocks", "points"])
      }),
      request.params
    );
    const query = parse(pageQuery.extend(sportQuery.shape), request.query);
    const service = options.statisticsService;
    const result = await service.ranking(
      params.id,
      params.kind,
      { sport: query.sport, teamId: query.teamId, playerId: query.playerId },
      query.page,
      query.limit,
      user.id
    );
    return {
      kind: params.kind,
      label: service.rankingLabel(params.kind),
      rankings: result.items,
      ...result
    };
  });
};
