import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { AppError } from "../errors/app-error.js";
import type { PublicProfileService } from "../public-profiles/public-profile-service.js";

const memberParams = z.object({ memberId: z.uuid() });
const organizerParams = z.object({ organizerId: z.uuid() });
const clubParams = z.object({ clubId: z.uuid() });

const historyQuery = z.object({
  sport: z.string().trim().max(40).optional(),
  championshipId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

type PublicProfileRoutesOptions = {
  publicProfileService?: PublicProfileService | undefined;
};

export const publicProfileRoutes: FastifyPluginAsync<
  PublicProfileRoutesOptions
> = async (app, options) => {
  const service = () => {
    if (!options.publicProfileService) {
      throw new AppError("Perfil não disponível.", 404, "PROFILE_NOT_AVAILABLE");
    }
    return options.publicProfileService;
  };

  app.get("/public/players/:memberId/matches", async (request) => {
    const params = memberParams.safeParse(request.params);
    const query = historyQuery.safeParse(request.query);
    if (!params.success || !query.success) {
      throw new AppError("Filtros inválidos.", 400, "VALIDATION_ERROR");
    }
    const result = await service().playerHistory(
      params.data.memberId,
      {
        sport: query.data.sport,
        championshipId: query.data.championshipId
      },
      query.data.page,
      query.data.limit
    );
    return result;
  });

  app.get("/public/organizers/:organizerId", async (request) => {
    const params = organizerParams.safeParse(request.params);
    if (!params.success) {
      throw new AppError("Organizador inválido.", 400, "VALIDATION_ERROR");
    }
    return service().organizerProfile(params.data.organizerId);
  });

  app.get("/public/clubs/:clubId", async (request) => {
    const params = clubParams.safeParse(request.params);
    if (!params.success) {
      throw new AppError("Clube inválido.", 400, "VALIDATION_ERROR");
    }
    return service().clubProfile(params.data.clubId);
  });
};
