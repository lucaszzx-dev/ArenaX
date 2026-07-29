import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchService } from "../matches/match-service.js";
import type { MatchEventService } from "../match-events/match-event-service.js";
import type { MatchPeriodService } from "../match-periods/match-period-service.js";
import type { ParticipantService } from "../participants/participant-service.js";

const slugParams = z.object({
  slug: z.string().trim().min(1).max(100)
});
const publicMatchParams = slugParams.extend({ matchId: z.uuid() });
const publicTeamParams = slugParams.extend({ teamId: z.uuid() });
const catalogQuery = z.object({
  search: z.string().trim().max(80).optional(),
  sport: z.string().trim().max(40).optional(),
  entryType: z.enum(["INDIVIDUAL", "TEAM"]).optional(),
  status: z.enum(["PUBLISHED", "FINISHED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(9)
});

type PublicChampionshipRoutesOptions = {
  championshipService: ChampionshipService;
  matchService: MatchService;
  matchEventService?: MatchEventService | undefined;
  matchPeriodService?: MatchPeriodService | undefined;
  participantService?: ParticipantService | undefined;
};

export const publicChampionshipRoutes: FastifyPluginAsync<
  PublicChampionshipRoutesOptions
> = async (app, options) => {
  app.get("/public/championships", async (request) => {
    const query = catalogQuery.safeParse(request.query);
    if (!query.success) {
      throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
    }
    const result = await options.championshipService.listPublic(query.data);
    return {
      ...result,
      items: result.items.map((championship) => ({
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport,
        description: championship.description,
        entryType: championship.entryType,
        status: championship.status,
        startsAt: championship.startsAt,
        endsAt: championship.endsAt
      }))
    };
  });

  app.get("/public/championships/:slug", async (request) => {
    const params = slugParams.safeParse(request.params);
    if (!params.success) {
      throw new AppError("Endereço de arena inválido.", 400, "VALIDATION_ERROR");
    }

    const championship = await options.championshipService.getPublic(
      params.data.slug
    );
    const overview = await options.matchService.publicOverview(championship);
    const statistics = options.matchEventService
      ? await options.matchEventService.statisticsPublic(
        championship.id,
        championship.sport
      )
      : [];
    const publicChampionship = {
      id: championship.id,
      name: championship.name,
      slug: championship.slug,
      sport: championship.sport,
      description: championship.description,
      entryType: championship.entryType,
      status: championship.status,
      winPoints: championship.winPoints,
      drawPoints: championship.drawPoints,
      lossPoints: championship.lossPoints,
      allowsDraw: championship.allowsDraw,
      startsAt: championship.startsAt,
      endsAt: championship.endsAt
    };

    return { championship: publicChampionship, ...overview, statistics };
  });

  app.get(
    "/public/championships/:slug/matches/:matchId",
    async (request) => {
      const params = publicMatchParams.safeParse(request.params);
      if (!params.success) {
        throw new AppError("Endereço de partida inválido.", 400, "VALIDATION_ERROR");
      }
      const championship = await options.championshipService.getPublic(
        params.data.slug
      );
      const overview = await options.matchService.publicOverview(championship);
      const match = overview.matches.find(
        (item) => item.id === params.data.matchId
      );
      if (!match) {
        throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
      }
      const events = options.matchEventService
        ? await options.matchEventService.listPublic(championship.id, match.id)
        : [];
      const periods = options.matchPeriodService
        ? await options.matchPeriodService.listPublic(championship.id, match.id)
        : [];
      return {
        championship: {
          id: championship.id,
          name: championship.name,
          slug: championship.slug,
          sport: championship.sport
        },
        match,
        events,
        periods
      };
    }
  );

  app.get("/public/championships/:slug/teams/:teamId", async (request) => {
    const params = publicTeamParams.safeParse(request.params);
    if (!params.success) throw new AppError("Equipe inválida.", 400, "VALIDATION_ERROR");
    const championship = await options.championshipService.getPublic(params.data.slug);
    if (!options.participantService) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }
    const team = await options.participantService.getPublicTeam(
      championship.id,
      params.data.teamId
    );
    return {
      championship: {
        name: championship.name,
        slug: championship.slug,
        sport: championship.sport
      },
      team
    };
  });
};
