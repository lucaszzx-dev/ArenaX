import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { MatchOperationService } from "../match-operations/match-operation-service.js";

const paramsSchema = z.object({ id: z.uuid(), matchId: z.uuid() });
const metadataSchema = z.object({
  venue: z.union([z.string().trim().max(120), z.null()])
    .transform((value) => value || null),
  referee: z.union([z.string().trim().max(120), z.null()])
    .transform((value) => value || null),
  operationalNotes: z.union([z.string().trim().max(1000), z.null()])
    .transform((value) => value || null)
});
const lineupSchema = z.object({
  entryId: z.uuid(),
  players: z.array(z.object({
    teamMemberId: z.uuid(),
    role: z.enum(["STARTER", "SUBSTITUTE"])
  })).max(50)
});

type MatchOperationRoutesOptions = {
  authService: AuthService;
  service: MatchOperationService;
  env: Env;
};

export const matchOperationRoutes: FastifyPluginAsync<
  MatchOperationRoutesOptions
> = async (app, options) => {
  const user = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/championships/:id/matches/:matchId/operations", async (request) => {
    const currentUser = await user(request);
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) throw validationError();
    return options.service.getMine(currentUser.id, params.data.id, params.data.matchId);
  });

  app.put(
    "/championships/:id/matches/:matchId/operations/metadata",
    async (request) => {
      const currentUser = await user(request);
      const params = paramsSchema.safeParse(request.params);
      const input = metadataSchema.safeParse(request.body);
      if (!params.success || !input.success) throw validationError();
      const metadata = await options.service.updateMetadata(
        currentUser.id,
        params.data.id,
        params.data.matchId,
        input.data
      );
      return { metadata };
    }
  );

  app.put(
    "/championships/:id/matches/:matchId/operations/lineup",
    async (request) => {
      const currentUser = await user(request);
      const params = paramsSchema.safeParse(request.params);
      const input = lineupSchema.safeParse(request.body);
      if (!params.success || !input.success) throw validationError();
      const lineup = await options.service.replaceLineup(
        currentUser.id,
        params.data.id,
        params.data.matchId,
        input.data.entryId,
        input.data.players
      );
      return { lineup };
    }
  );
};

function validationError() {
  return new AppError("Revise os dados da partida.", 400, "VALIDATION_ERROR");
}
