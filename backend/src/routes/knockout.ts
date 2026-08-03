import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { KnockoutService } from "../knockout/knockout-service.js";

const idParams = z.object({ id: z.uuid() });
const slugParams = z.object({ slug: z.string().trim().min(1).max(100) });

type KnockoutRoutesOptions = {
  authService: AuthService;
  knockoutService: KnockoutService;
  env: Env;
};

export const knockoutRoutes: FastifyPluginAsync<KnockoutRoutesOptions> = async (
  app,
  options
) => {
  const user = (request: Parameters<typeof requireUser>[0]) =>
    requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);

  app.get("/championships/:id/bracket", async (request) => {
    const currentUser = await user(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return options.knockoutService.getMine(currentUser.id, params.data.id);
  });

  app.post("/championships/:id/bracket/generate", async (request, reply) => {
    const currentUser = await user(request);
    const params = idParams.safeParse(request.params);
    const body = request.body as Record<string, unknown> | undefined;
    if (!params.success) throw validationError();
    const thirdPlace = body?.thirdPlace === false ? false : true;
    const result = await options.knockoutService.generate(
      currentUser.id,
      params.data.id,
      thirdPlace
    );
    return reply.status(201).send(result);
  });

  app.get("/public/championships/:slug/bracket", async (request) => {
    const params = slugParams.safeParse(request.params);
    if (!params.success) throw validationError();
    return options.knockoutService.getPublic(params.data.slug);
  });

  app.get("/championships/:id/bracket/champion", async (request) => {
    const currentUser = await user(request);
    const params = idParams.safeParse(request.params);
    if (!params.success) throw validationError();
    const championEntryId = await options.knockoutService.getChampion(
      currentUser.id,
      params.data.id
    );
    return { championEntryId };
  });
};

function validationError() {
  return new AppError("Identificador inválido.", 400, "VALIDATION_ERROR");
}
