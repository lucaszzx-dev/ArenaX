import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { StatisticsService } from "../match-events/statistics-service.js";

const slugParams = z.object({
  slug: z.string().trim().min(1).max(100)
});
const headToHeadParams = slugParams.extend({
  entryAId: z.uuid(),
  entryBId: z.uuid()
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  teamId: z.uuid().optional(),
  playerId: z.uuid().optional()
});
const sportQuery = z.object({
  sport: z.string().trim().max(40).optional()
});
const standingsQuery = pageQuery.extend(sportQuery.shape).omit({ page: true, limit: true });

type PublicStatisticsRoutesOptions = {
  championshipService: ChampionshipService;
  statisticsService?: StatisticsService | undefined;
};

export const publicStatisticsRoutes: FastifyPluginAsync<
  PublicStatisticsRoutesOptions
> = async (app, options) => {
  const stats = () => {
    if (!options.statisticsService) {
      throw new AppError(
        "Estatísticas não disponíveis.",
        404,
        "STATS_NOT_AVAILABLE"
      );
    }
    return options.statisticsService;
  };

  app.get("/public/championships/:slug/statistics", async (request) => {
    const params = slugParams.safeParse(request.params);
    const query = pageQuery.extend(sportQuery.shape).safeParse(request.query);
    if (!params.success || !query.success) {
      throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
    }
    const championship = await options.championshipService.getPublic(params.data.slug);
    const result = await stats().statistics(
      championship.id,
      { sport: query.data.sport, teamId: query.data.teamId, playerId: query.data.playerId },
      query.data.page,
      query.data.limit
    );
    return {
      championship: {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      ...result
    };
  });

  app.get("/public/championships/:slug/standings", async (request) => {
    const params = slugParams.safeParse(request.params);
    const query = standingsQuery.safeParse(request.query);
    if (!params.success || !query.success) {
      throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
    }
    const championship = await options.championshipService.getPublic(params.data.slug);
    const rows = await stats().clubStandings(championship.id, {
      teamId: query.data.teamId
    });
    return {
      championship: {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      items: rows,
      total: rows.length
    };
  });

  app.get("/public/championships/:slug/streaks", async (request) => {
    const params = slugParams.safeParse(request.params);
    const query = standingsQuery.safeParse(request.query);
    if (!params.success || !query.success) {
      throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
    }
    const championship = await options.championshipService.getPublic(params.data.slug);
    const rows = await stats().streakStats(championship.id, {
      teamId: query.data.teamId
    });
    return {
      championship: {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      items: rows,
      total: rows.length
    };
  });

  app.get("/public/championships/:slug/head-to-head/:entryAId/:entryBId", async (request) => {
    const params = headToHeadParams.safeParse(request.params);
    if (!params.success) throw new AppError("Confronto inválido.", 400, "VALIDATION_ERROR");
    const championship = await options.championshipService.getPublic(params.data.slug);
    const rows = await stats().headToHead(
      championship.id,
      params.data.entryAId,
      params.data.entryBId
    );
    return {
      championship: {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      entryAId: params.data.entryAId,
      entryBId: params.data.entryBId,
      items: rows,
      total: rows.length
    };
  });

  app.get("/public/championships/:slug/highlights", async (request) => {
    const params = slugParams.safeParse(request.params);
    const query = sportQuery.safeParse(request.query);
    if (!params.success || !query.success) {
      throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
    }
    const championship = await options.championshipService.getPublic(params.data.slug);
    const items = await stats().highlights(championship.id, {
      sport: query.data.sport
    });
    return {
      championship: {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      items,
      total: items.length
    };
  });

  app.get("/public/championships/:slug/rankings/:kind", async (request) => {
    const params = slugParams
      .extend({
        kind: z.enum(["scorer", "aces", "blocks", "points"])
      })
      .safeParse(request.params);
    const query = pageQuery.extend(sportQuery.shape).safeParse(request.query);
    if (!params.success || !query.success) {
      throw new AppError("Ranking inválido.", 400, "VALIDATION_ERROR");
    }
    const championship = await options.championshipService.getPublic(params.data.slug);
    const service = stats();
    const result = await service.ranking(
      championship.id,
      params.data.kind,
      { sport: query.data.sport, teamId: query.data.teamId, playerId: query.data.playerId },
      query.data.page,
      query.data.limit
    );
    return {
      championship: {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      kind: params.data.kind,
      label: service.rankingLabel(params.data.kind),
      ...result
    };
  });
};
