import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { MatchEventService } from "../match-events/match-event-service.js";

const matchParams = z.object({
  id: z.uuid(),
  matchId: z.uuid()
});
const eventParams = matchParams.extend({ eventId: z.uuid() });
const eventSchema = z.object({
  entryId: z.uuid(),
  teamMemberId: z.union([z.uuid(), z.null()]).default(null),
  type: z.enum([
    "GOAL",
    "OWN_GOAL",
    "YELLOW_CARD",
    "RED_CARD",
    "FREE_THROW",
    "TWO_POINT_SHOT",
    "THREE_POINT_SHOT",
    "VOLLEYBALL_POINT",
    "ACE",
    "BLOCK",
    "ASSIST",
    "SUBSTITUTION",
    "PENALTY_CONVERTED",
    "PENALTY_MISSED"
  ]),
  periodNumber: z.union([z.number().int().min(1).max(20), z.null()]).default(null),
  clockSeconds: z
    .union([z.number().int().min(0).max(24 * 60 * 60), z.null()])
    .default(null),
  notes: z
    .union([z.string().trim().max(200), z.null()])
    .transform((value) => value || null)
    .default(null),
  relatedEventId: z.union([z.uuid(), z.null()]).default(null)
});

type MatchEventRoutesOptions = {
  authService: AuthService;
  matchEventService: MatchEventService;
  env: Env;
};

export const matchEventRoutes: FastifyPluginAsync<
  MatchEventRoutesOptions
> = async (app, options) => {
  const getUser = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/championships/:id/matches/:matchId/events", async (request) => {
    const user = await getUser(request);
    const params = matchParams.safeParse(request.params);
    if (!params.success) throw validationError();

    const events = await options.matchEventService.list(
      user.id,
      params.data.id,
      params.data.matchId
    );
    return { events };
  });

  app.get("/championships/:id/matches/:matchId/suspended-players", async (request) => {
    const params = matchParams.safeParse(request.params);
    if (!params.success) throw validationError();
    const query = z.object({ entryId: z.uuid() }).safeParse(request.query);
    if (!query.success) throw validationError();

    const result = await options.matchEventService.suspendedPlayers(
      params.data.id,
      query.data.entryId
    );
    return { suspendedPlayerIds: result };
  });

  app.post(
    "/championships/:id/matches/:matchId/events",
    async (request, reply) => {
      const user = await getUser(request);
      const params = matchParams.safeParse(request.params);
      const input = eventSchema.safeParse(request.body);
      if (!params.success || !input.success) throw validationError();

      const event = await options.matchEventService.create(
        user.id,
        params.data.id,
        params.data.matchId,
        input.data
      );
      return reply.status(201).send({ event });
    }
  );

  app.delete(
    "/championships/:id/matches/:matchId/events/:eventId",
    async (request, reply) => {
      const user = await getUser(request);
      const params = eventParams.safeParse(request.params);
      if (!params.success) throw validationError();

      await options.matchEventService.delete(
        user.id,
        params.data.id,
        params.data.matchId,
        params.data.eventId
      );
      return reply.status(204).send();
    }
  );

  app.put(
    "/championships/:id/matches/:matchId/events/:eventId",
    async (request) => {
      const user = await getUser(request);
      const params = eventParams.safeParse(request.params);
      const input = eventSchema.safeParse(request.body);
      if (!params.success || !input.success) throw validationError();
      const event = await options.matchEventService.update(
        user.id,
        params.data.id,
        params.data.matchId,
        params.data.eventId,
        input.data
      );
      return { event };
    }
  );
};

function validationError() {
  return new AppError(
    "Revise os dados do evento.",
    400,
    "VALIDATION_ERROR"
  );
}