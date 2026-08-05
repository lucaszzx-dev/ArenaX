import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { requireUser } from "../auth/require-user.js";
import type { AuthService } from "../auth/auth-service.js";
import type { ChampionshipService } from "../championships/championship-service.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const nullableDate = z
  .union([z.iso.datetime(), z.literal(""), z.null()])
  .transform((value) => (value ? new Date(value) : null));

const championshipInputSchema = z.object({
  name: z.string().trim().min(3).max(100),
  sport: z.string().trim().min(2).max(50),
  description: z
    .union([z.string().trim().max(500), z.null()])
    .transform((value) => value || null),
  entryType: z.enum(["INDIVIDUAL", "TEAM"]),
  format: z.enum(["LEAGUE", "KNOCKOUT", "GROUP_KNOCKOUT"]).default("LEAGUE"),
  winPoints: z.number().int().min(0).max(20),
  drawPoints: z.number().int().min(0).max(20),
  lossPoints: z.number().int().min(0).max(20),
  allowsDraw: z.boolean(),
  bestOfSets: z.number().int().min(3).max(9).default(5),
  thirdPlace: z.boolean().default(true),
  groupCount: z.number().int().min(2).max(32).nullable().optional(),
  groupLegs: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
  qualifiersPerGroup: z.number().int().min(1).max(16).nullable().optional(),
  maxYellowCards: z.number().int().min(0).max(20).default(0),
  startsAt: nullableDate,
  endsAt: nullableDate
});
const championshipUpdateSchema = championshipInputSchema.omit({ format: true });

const idParamsSchema = z.object({
  id: z.uuid()
});

type ChampionshipRoutesOptions = {
  authService: AuthService;
  championshipService: ChampionshipService;
  env: Env;
};

export const championshipRoutes: FastifyPluginAsync<
  ChampionshipRoutesOptions
> = async (app, options) => {
  async function getUser(request: Parameters<typeof requireUser>[0]) {
    return requireUser(
      request,
      options.authService,
      options.env.SESSION_COOKIE_NAME
    );
  }

  app.post("/championships", async (request, reply) => {
    const user = await getUser(request);
    const input = championshipInputSchema.safeParse(request.body);

    if (!input.success) {
      throw new AppError(
        "Revise os dados do campeonato.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const championship = await options.championshipService.create(
      user.id,
      { ...input.data, groupCount: input.data.groupCount ?? null, groupLegs: input.data.groupLegs ?? null, qualifiersPerGroup: input.data.qualifiersPerGroup ?? null }
    );

    return reply.status(201).send({ championship });
  });

  app.get("/championships", async (request) => {
    const user = await getUser(request);
    const championships = await options.championshipService.listMine(user.id);

    return { championships };
  });

  app.get("/championships/:id", async (request) => {
    const user = await getUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw new AppError(
        "Identificador de campeonato inválido.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const championship = await options.championshipService.getMine(
      user.id,
      params.data.id
    );

    return { championship };
  });

  app.delete("/championships/:id", async (request, reply) => {
    const user = await getUser(request);
    const params = idParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw new AppError(
        "Identificador de campeonato inválido.",
        400,
        "VALIDATION_ERROR"
      );
    }

    await options.championshipService.delete(user.id, params.data.id);
    return reply.status(204).send();
  });

  app.put("/championships/:id", async (request) => {
    const user = await getUser(request);
    const params = idParamsSchema.safeParse(request.params);
    const input = championshipUpdateSchema.safeParse(request.body);

    if (!params.success || !input.success) {
      throw new AppError(
        "Revise os dados do campeonato.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const championship = await options.championshipService.update(
      user.id,
      params.data.id,
      { ...input.data, groupCount: input.data.groupCount ?? null, groupLegs: input.data.groupLegs ?? null, qualifiersPerGroup: input.data.qualifiersPerGroup ?? null }
    );

    return { championship };
  });
};
