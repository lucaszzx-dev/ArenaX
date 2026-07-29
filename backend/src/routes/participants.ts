import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { ParticipantService } from "../participants/participant-service.js";

const championshipParamsSchema = z.object({ id: z.uuid() });
const teamParamsSchema = championshipParamsSchema.extend({ teamId: z.uuid() });
const participantParamsSchema = championshipParamsSchema.extend({
  participantId: z.uuid()
});
const memberParamsSchema = teamParamsSchema.extend({ memberId: z.uuid() });
const personSchema = z.object({ displayName: z.string().trim().min(2).max(80) });
const memberSchema = personSchema.extend({
  jerseyNumber: z
    .union([z.number().int().min(0).max(999), z.null()])
    .default(null),
  position: z
    .union([z.string().trim().max(40), z.null()])
    .transform((value) => value || null)
    .default(null)
});
const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  shortName: z
    .union([z.string().trim().max(12), z.null()])
    .transform((value) => value || null),
  logoUrl: z
    .union([z.url().max(500), z.literal(""), z.null()])
    .transform((value) => value || null)
});
const captainSchema = z.object({ memberId: z.uuid() });

type ParticipantRoutesOptions = {
  authService: AuthService;
  participantService: ParticipantService;
  env: Env;
};

export const participantRoutes: FastifyPluginAsync<
  ParticipantRoutesOptions
> = async (app, options) => {
  async function getUser(request: Parameters<typeof requireUser>[0]) {
    return requireUser(
      request,
      options.authService,
      options.env.SESSION_COOKIE_NAME
    );
  }

  app.get("/championships/:id/participants", async (request) => {
    const user = await getUser(request);
    const params = championshipParamsSchema.safeParse(request.params);
    if (!params.success) throw identifierError();

    return options.participantService.list(user.id, params.data.id);
  });

  app.post("/championships/:id/participants", async (request, reply) => {
    const user = await getUser(request);
    const params = championshipParamsSchema.safeParse(request.params);
    const input = personSchema.safeParse(request.body);
    if (!params.success) throw identifierError();
    if (!input.success) throw validationError();

    const participant = await options.participantService.createIndividual(
      user.id,
      params.data.id,
      input.data.displayName
    );
    return reply.status(201).send({ participant });
  });

  app.delete("/championships/:id/participants/:participantId", async (request, reply) => {
    const user = await getUser(request);
    const params = participantParamsSchema.safeParse(request.params);
    if (!params.success) throw identifierError();

    await options.participantService.deleteIndividual(
      user.id,
      params.data.id,
      params.data.participantId
    );
    return reply.status(204).send();
  });

  app.post("/championships/:id/teams", async (request, reply) => {
    const user = await getUser(request);
    const params = championshipParamsSchema.safeParse(request.params);
    const input = teamSchema.safeParse(request.body);
    if (!params.success) throw identifierError();
    if (!input.success) throw validationError();

    const team = await options.participantService.createTeam(
      user.id,
      params.data.id,
      input.data.name,
      input.data.shortName,
      input.data.logoUrl
    );
    return reply.status(201).send({ team });
  });

  app.put("/championships/:id/teams/:teamId", async (request) => {
    const user = await getUser(request);
    const params = teamParamsSchema.safeParse(request.params);
    const input = teamSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const team = await options.participantService.updateTeam(
      user.id,
      params.data.id,
      params.data.teamId,
      input.data
    );
    return { team };
  });

  app.put("/championships/:id/teams/:teamId/captain", async (request) => {
    const user = await getUser(request);
    const params = teamParamsSchema.safeParse(request.params);
    const input = captainSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const team = await options.participantService.setCaptain(
      user.id,
      params.data.id,
      params.data.teamId,
      input.data.memberId
    );
    return { team };
  });

  app.delete("/championships/:id/teams/:teamId", async (request, reply) => {
    const user = await getUser(request);
    const params = teamParamsSchema.safeParse(request.params);
    if (!params.success) throw identifierError();

    await options.participantService.deleteTeam(
      user.id,
      params.data.id,
      params.data.teamId
    );
    return reply.status(204).send();
  });

  app.post("/championships/:id/teams/:teamId/members", async (request, reply) => {
    const user = await getUser(request);
    const params = teamParamsSchema.safeParse(request.params);
    const input = memberSchema.safeParse(request.body);
    if (!params.success) throw identifierError();
    if (!input.success) throw validationError();

    const member = await options.participantService.addTeamMember(
      user.id,
      params.data.id,
      params.data.teamId,
      input.data.displayName,
      input.data.jerseyNumber,
      input.data.position
    );
    return reply.status(201).send({ member });
  });

  app.delete(
    "/championships/:id/teams/:teamId/members/:memberId",
    async (request, reply) => {
      const user = await getUser(request);
      const params = memberParamsSchema.safeParse(request.params);
      if (!params.success) throw identifierError();

      await options.participantService.deleteTeamMember(
        user.id,
        params.data.id,
        params.data.teamId,
        params.data.memberId
      );
      return reply.status(204).send();
    }
  );
};

function validationError() {
  return new AppError(
    "Revise os dados informados.",
    400,
    "VALIDATION_ERROR"
  );
}

function identifierError() {
  return new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
}
