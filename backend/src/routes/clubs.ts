import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { ClubService } from "../clubs/club-service.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const clubParams = z.object({ clubId: z.uuid() });
const memberParams = clubParams.extend({ memberId: z.uuid() });
const importParams = clubParams.extend({ championshipId: z.uuid() });
const identitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  shortName: z.union([z.string().trim().max(12), z.null()])
    .transform((value) => value || null),
  logoUrl: z.union([z.url().max(500), z.literal(""), z.null()])
    .transform((value) => value || null)
});
const memberSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  jerseyNumber: z.union([z.number().int().min(0).max(999), z.null()]).default(null),
  position: z.union([z.string().trim().max(40), z.null()])
    .transform((value) => value || null)
    .default(null)
});
const captainSchema = z.object({ memberId: z.uuid() });

type ClubRoutesOptions = {
  authService: AuthService;
  clubService: ClubService;
  env: Env;
};

export const clubRoutes: FastifyPluginAsync<ClubRoutesOptions> = async (app, options) => {
  const user = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/clubs", async (request) => {
    const currentUser = await user(request);
    return { clubs: await options.clubService.list(currentUser.id) };
  });

  app.post("/clubs", async (request, reply) => {
    const currentUser = await user(request);
    const input = identitySchema.safeParse(request.body);
    if (!input.success) throw validationError();
    const club = await options.clubService.create(currentUser.id, input.data);
    return reply.status(201).send({ club });
  });

  app.put("/clubs/:clubId", async (request) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = identitySchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return { club: await options.clubService.update(currentUser.id, params.data.clubId, input.data) };
  });

  app.delete("/clubs/:clubId", async (request, reply) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    if (!params.success) throw validationError();
    await options.clubService.delete(currentUser.id, params.data.clubId);
    return reply.status(204).send();
  });

  app.post("/clubs/:clubId/members", async (request, reply) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = memberSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const member = await options.clubService.addMember(
      currentUser.id,
      params.data.clubId,
      input.data
    );
    return reply.status(201).send({ member });
  });

  app.delete("/clubs/:clubId/members/:memberId", async (request, reply) => {
    const currentUser = await user(request);
    const params = memberParams.safeParse(request.params);
    if (!params.success) throw validationError();
    await options.clubService.deleteMember(
      currentUser.id,
      params.data.clubId,
      params.data.memberId
    );
    return reply.status(204).send();
  });

  app.put("/clubs/:clubId/captain", async (request) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = captainSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return {
      club: await options.clubService.setCaptain(
        currentUser.id,
        params.data.clubId,
        input.data.memberId
      )
    };
  });

  app.post("/clubs/:clubId/import/:championshipId", async (request, reply) => {
    const currentUser = await user(request);
    const params = importParams.safeParse(request.params);
    if (!params.success) throw validationError();
    const result = await options.clubService.importIntoChampionship(
      currentUser.id,
      params.data.clubId,
      params.data.championshipId
    );
    return reply.status(201).send(result);
  });
};

function validationError() {
  return new AppError("Revise os dados informados.", 400, "VALIDATION_ERROR");
}
