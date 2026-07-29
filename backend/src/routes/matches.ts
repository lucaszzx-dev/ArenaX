import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { MatchService } from "../matches/match-service.js";
import type { MatchAuditService } from "../match-audit/match-audit-service.js";

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
const scoreSchema = z.object({
  homeScore: z.number().int().min(0).max(9999),
  awayScore: z.number().int().min(0).max(9999)
});
const statusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "FINISHED"])
});
const matchActionSchema = z.object({
  action: z.enum(["CANCEL", "REOPEN"])
});
const scheduleSchema = z.object({ scheduledAt: nullableDate });
const generateSchema = z.object({
  legs: z.union([z.literal(1), z.literal(2)]).default(1),
  startsAt: nullableDate,
  intervalDays: z.number().int().min(1).max(30).default(7)
});

type MatchRoutesOptions = {
  authService: AuthService;
  matchService: MatchService;
  matchAuditService?: MatchAuditService | undefined;
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

  app.get("/championships/:id/matches/:matchId/audit", async (request) => {
    const user = await getUser(request);
    const params = matchParams.safeParse(request.params);
    if (!params.success) throw validationError();
    if (!options.matchAuditService) return { logs: [] };
    const logs = await options.matchAuditService.list(
      user.id,
      params.data.id,
      params.data.matchId
    );
    return { logs };
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

  app.post("/championships/:id/matches/generate", async (request, reply) => {
    const user = await getUser(request);
    const params = championshipParams.safeParse(request.params);
    const input = generateSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const result = await options.matchService.generateLeague(
      user.id,
      params.data.id,
      input.data
    );
    return reply.status(201).send(result);
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

  app.put("/championships/:id/matches/:matchId/score", async (request) => {
    const user = await getUser(request);
    const params = matchParams.safeParse(request.params);
    const input = scoreSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();

    const match = await options.matchService.recordScore(
      user.id,
      params.data.id,
      params.data.matchId,
      input.data.homeScore,
      input.data.awayScore
    );
    return { match };
  });

  app.get("/championships/:id/standings", async (request) => {
    const user = await getUser(request);
    const params = championshipParams.safeParse(request.params);
    if (!params.success) throw validationError();
    const standings = await options.matchService.standings(
      user.id,
      params.data.id
    );
    return { standings };
  });

  app.put("/championships/:id/status", async (request) => {
    const user = await getUser(request);
    const params = championshipParams.safeParse(request.params);
    const input = statusSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const championship = await options.matchService.changeChampionshipStatus(
      user.id,
      params.data.id,
      input.data.status
    );
    return { championship };
  });

  app.put("/championships/:id/matches/:matchId/schedule", async (request) => {
    const user = await getUser(request);
    const params = matchParams.safeParse(request.params);
    const input = scheduleSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const match = await options.matchService.updateSchedule(
      user.id,
      params.data.id,
      params.data.matchId,
      input.data.scheduledAt
    );
    return { match };
  });

  app.put("/championships/:id/matches/:matchId/status", async (request) => {
    const user = await getUser(request);
    const params = matchParams.safeParse(request.params);
    const input = matchActionSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const match = await options.matchService.changeMatchStatus(
      user.id,
      params.data.id,
      params.data.matchId,
      input.data.action
    );
    return { match };
  });
};

function validationError() {
  return new AppError("Revise os dados da partida.", 400, "VALIDATION_ERROR");
}
