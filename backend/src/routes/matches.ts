import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { MatchService } from "../matches/match-service.js";

const championshipParams = z.object({ id: z.uuid() });
const matchParams = championshipParams.extend({ matchId: z.uuid() });
const nullableDate = z
  .union([z.iso.datetime(), z.literal(""), z.null()])
  .transform((value) => value ? new Date(value) : null);
const createMatchSchema = z.object({
  homeEntryId: z.uuid(),
  awayEntryId: z.uuid(),
  scheduledAt: nullableDate
});

type MatchRoutesOptions = {
  authService: AuthService;
  matchService: MatchService;
  env: Env;
};

export const matchRoutes: FastifyPluginAsync<MatchRoutesOptions> = async (
  app,
  options
) => {
  const getUser = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/championships/:id/matches", async (request) => {
    const user = await getUser(request);
    const params = championshipParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return options.matchService.list(user.id, params.data.id);
  });

  app.post("/championships/:id/matches", async (request, reply) => {
    const user = await getUser(request);
    const params = championshipParams.safeParse(request.params);
    const input = createMatchSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();

    const match = await options.matchService.create(
      user.id,
      params.data.id,
      input.data
    );
    return reply.status(201).send({ match });
  });

  app.delete("/championships/:id/matches/:matchId", async (request, reply) => {
    const user = await getUser(request);
    const params = matchParams.safeParse(request.params);
    if (!params.success) throw validationError();

    await options.matchService.delete(
      user.id,
      params.data.id,
      params.data.matchId
    );
    return reply.status(204).send();
  });
};

function validationError() {
  return new AppError("Revise os dados da partida.", 400, "VALIDATION_ERROR");
}
