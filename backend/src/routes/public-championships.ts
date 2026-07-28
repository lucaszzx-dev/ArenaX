import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type { MatchService } from "../matches/match-service.js";

const slugParams = z.object({
  slug: z.string().trim().min(1).max(100)
});
const publicMatchParams = slugParams.extend({ matchId: z.uuid() });

type PublicChampionshipRoutesOptions = {
  championshipService: ChampionshipService;
  matchService: MatchService;
};

export const publicChampionshipRoutes: FastifyPluginAsync<
  PublicChampionshipRoutesOptions
> = async (app, options) => {
  app.get("/public/championships/:slug", async (request) => {
    const params = slugParams.safeParse(request.params);
    if (!params.success) {
      throw new AppError("Endereço de arena inválido.", 400, "VALIDATION_ERROR");
    }

    const championship = await options.championshipService.getPublic(
      params.data.slug
    );
    const overview = await options.matchService.publicOverview(championship);
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

    return { championship: publicChampionship, ...overview };
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
      return {
        championship: {
          id: championship.id,
          name: championship.name,
          slug: championship.slug,
          sport: championship.sport
        },
        match
      };
    }
  );
};
