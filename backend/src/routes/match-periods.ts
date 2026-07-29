import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { MatchPeriodService } from "../match-periods/match-period-service.js";

const paramsSchema = z.object({ id: z.uuid(), matchId: z.uuid() });
const periodParamsSchema = paramsSchema.extend({
  periodNumber: z.coerce.number().int().min(1).max(8)
});
const periodSchema = z.object({
  periodNumber: z.number().int().min(1).max(8),
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999)
});

type MatchPeriodRoutesOptions = {
  authService: AuthService;
  matchPeriodService: MatchPeriodService;
  env: Env;
};

export const matchPeriodRoutes: FastifyPluginAsync<
  MatchPeriodRoutesOptions
> = async (app, options) => {
  const getUser = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/championships/:id/matches/:matchId/periods", async (request) => {
    const user = await getUser(request);
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) throw validationError();
    const periods = await options.matchPeriodService.listMine(
      user.id,
      params.data.id,
      params.data.matchId
    );
    return { periods };
  });

  app.put("/championships/:id/matches/:matchId/periods", async (request) => {
    const user = await getUser(request);
    const params = paramsSchema.safeParse(request.params);
    const input = periodSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const period = await options.matchPeriodService.save(
      user.id,
      params.data.id,
      params.data.matchId,
      input.data
    );
    return { period };
  });

  app.delete(
    "/championships/:id/matches/:matchId/periods/:periodNumber",
    async (request, reply) => {
      const user = await getUser(request);
      const params = periodParamsSchema.safeParse(request.params);
      if (!params.success) throw validationError();
      await options.matchPeriodService.delete(
        user.id,
        params.data.id,
        params.data.matchId,
        params.data.periodNumber
      );
      return reply.status(204).send();
    }
  );
};

function validationError() {
  return new AppError("Revise os dados da parcial.", 400, "VALIDATION_ERROR");
}
