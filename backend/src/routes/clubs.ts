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
const teamParams = clubParams.extend({ teamId: z.uuid() });
const seasonParams = clubParams.extend({ seasonId: z.uuid() });
const squadParams = clubParams.extend({ squadId: z.uuid() });
const staffParams = clubParams.extend({ staffId: z.uuid() });

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()])
    .transform((value) => value || null);

const colorSchema = z.union([
  z.string().regex(/^#[0-9a-fA-F]{6}$/),
  z.literal(""),
  z.null()
]).transform((value) => value || null);

const identitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  shortName: nullableText(12),
  logoUrl: z.union([z.url().max(500), z.literal(""), z.null()])
    .transform((value) => value || null),
  primaryColor: colorSchema.default(null),
  secondaryColor: colorSchema.default(null),
  homeKit: nullableText(120).default(null),
  awayKit: nullableText(120).default(null)
});

const memberSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  jerseyNumber: z.union([z.number().int().min(0).max(999), z.null()]).default(null),
  position: z.union([z.string().trim().max(40), z.null()])
    .transform((value) => value || null)
    .default(null)
});

const seasonSchema = z.object({
  name: z.string().trim().min(2).max(80),
  startsAt: z.union([z.iso.datetime(), z.null()])
    .transform((value) => value ? new Date(value) : null)
    .default(null),
  endsAt: z.union([z.iso.datetime(), z.null()])
    .transform((value) => value ? new Date(value) : null)
    .default(null)
});

const squadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: nullableText(40),
  sport: nullableText(40),
  seasonId: z.union([z.uuid(), z.null()]).default(null),
  isPrimary: z.boolean().default(false)
});

const squadMembersSchema = z.object({
  members: z.array(z.object({
    clubMemberId: z.uuid(),
    role: z.string().trim().min(2).max(40).default("PLAYER")
  })).max(200)
});

const staffSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(40)
});

const importBodySchema = z.object({
  memberIds: z.array(z.uuid()).max(200).optional()
});

const rosterImportSchema = z.object({
  format: z.enum(["json", "csv"]),
  content: z.string().min(1).max(1_000_000),
  squadId: z.union([z.uuid(), z.null()]).default(null)
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

  app.put("/clubs/:clubId/members/:memberId", async (request) => {
    const currentUser = await user(request);
    const params = memberParams.safeParse(request.params);
    const input = memberSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return {
      member: await options.clubService.updateMember(
        currentUser.id,
        params.data.clubId,
        params.data.memberId,
        input.data
      )
    };
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

  app.post("/clubs/:clubId/seasons", async (request, reply) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = seasonSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const season = await options.clubService.addSeason(
      currentUser.id,
      params.data.clubId,
      input.data
    );
    return reply.status(201).send({ season });
  });

  app.put("/clubs/:clubId/seasons/:seasonId", async (request) => {
    const currentUser = await user(request);
    const params = seasonParams.safeParse(request.params);
    const input = seasonSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return {
      season: await options.clubService.updateSeason(
        currentUser.id,
        params.data.clubId,
        params.data.seasonId,
        input.data
      )
    };
  });

  app.delete("/clubs/:clubId/seasons/:seasonId", async (request, reply) => {
    const currentUser = await user(request);
    const params = seasonParams.safeParse(request.params);
    if (!params.success) throw validationError();
    await options.clubService.deleteSeason(
      currentUser.id,
      params.data.clubId,
      params.data.seasonId
    );
    return reply.status(204).send();
  });

  app.post("/clubs/:clubId/squads", async (request, reply) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = squadSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const squad = await options.clubService.addSquad(
      currentUser.id,
      params.data.clubId,
      input.data
    );
    return reply.status(201).send({ squad });
  });

  app.put("/clubs/:clubId/squads/:squadId", async (request) => {
    const currentUser = await user(request);
    const params = squadParams.safeParse(request.params);
    const input = squadSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return {
      squad: await options.clubService.updateSquad(
        currentUser.id,
        params.data.clubId,
        params.data.squadId,
        input.data
      )
    };
  });

  app.put("/clubs/:clubId/squads/:squadId/members", async (request) => {
    const currentUser = await user(request);
    const params = squadParams.safeParse(request.params);
    const input = squadMembersSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return {
      squad: await options.clubService.setSquadMembers(
        currentUser.id,
        params.data.clubId,
        params.data.squadId,
        input.data.members
      )
    };
  });

  app.delete("/clubs/:clubId/squads/:squadId", async (request, reply) => {
    const currentUser = await user(request);
    const params = squadParams.safeParse(request.params);
    if (!params.success) throw validationError();
    await options.clubService.deleteSquad(
      currentUser.id,
      params.data.clubId,
      params.data.squadId
    );
    return reply.status(204).send();
  });

  app.post("/clubs/:clubId/staff", async (request, reply) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = staffSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    const staff = await options.clubService.addStaff(
      currentUser.id,
      params.data.clubId,
      input.data
    );
    return reply.status(201).send({ staff });
  });

  app.delete("/clubs/:clubId/staff/:staffId", async (request, reply) => {
    const currentUser = await user(request);
    const params = staffParams.safeParse(request.params);
    if (!params.success) throw validationError();
    await options.clubService.deleteStaff(
      currentUser.id,
      params.data.clubId,
      params.data.staffId
    );
    return reply.status(204).send();
  });

  app.post("/clubs/:clubId/import/:championshipId", async (request, reply) => {
    const currentUser = await user(request);
    const params = importParams.safeParse(request.params);
    const input = importBodySchema.safeParse(request.body ?? {});
    if (!params.success || !input.success) throw validationError();
    const result = await options.clubService.importIntoChampionship(
      currentUser.id,
      params.data.clubId,
      params.data.championshipId,
      input.data.memberIds
    );
    return reply.status(201).send(result);
  });

  app.get("/clubs/:clubId/teams", async (request) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return {
      teams: await options.clubService.listImportedTeams(
        currentUser.id,
        params.data.clubId
      )
    };
  });

  app.get("/clubs/:clubId/teams/:teamId/sync/preview", async (request) => {
    const currentUser = await user(request);
    const params = teamParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return options.clubService.previewTeamSync(
      currentUser.id,
      params.data.clubId,
      params.data.teamId
    );
  });

  app.post("/clubs/:clubId/teams/:teamId/sync", async (request) => {
    const currentUser = await user(request);
    const params = teamParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return options.clubService.applyTeamSync(
      currentUser.id,
      params.data.clubId,
      params.data.teamId
    );
  });

  app.get("/clubs/:clubId/roster/export", async (request, reply) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const query = z.object({ format: z.enum(["json", "csv"]).default("json") })
      .safeParse(request.query);
    if (!params.success || !query.success) throw validationError();
    const result = await options.clubService.exportRoster(
      currentUser.id,
      params.data.clubId,
      query.data.format
    );
    return reply
      .header("content-type", result.contentType)
      .header("content-disposition", `attachment; filename="${result.filename}"`)
      .send(result.content);
  });

  app.post("/clubs/:clubId/roster/import", async (request) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    const input = rosterImportSchema.safeParse(request.body);
    if (!params.success || !input.success) throw validationError();
    return {
      result: await options.clubService.importRoster(
        currentUser.id,
        params.data.clubId,
        input.data.format,
        input.data.content,
        input.data.squadId ?? undefined
      )
    };
  });

  app.get("/clubs/:clubId/audit-logs", async (request) => {
    const currentUser = await user(request);
    const params = clubParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return {
      logs: await options.clubService.listAuditLogs(
        currentUser.id,
        params.data.clubId
      )
    };
  });
};

function validationError() {
  return new AppError("Revise os dados informados.", 400, "VALIDATION_ERROR");
}


