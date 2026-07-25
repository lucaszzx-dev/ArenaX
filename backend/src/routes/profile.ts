import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  avatarUrl: z
    .union([z.url(), z.literal(""), z.null()])
    .transform((value) => value || null),
  bio: z
    .union([z.string().trim().max(240), z.null()])
    .transform((value) => value || null)
});

type ProfileRoutesOptions = {
  authService: AuthService;
  env: Env;
};

export const profileRoutes: FastifyPluginAsync<ProfileRoutesOptions> = async (
  app,
  options
) => {
  app.get("/profile", async (request) => {
    const user = await requireUser(
      request,
      options.authService,
      options.env.SESSION_COOKIE_NAME
    );

    return { user };
  });

  app.put("/profile", async (request) => {
    const currentUser = await requireUser(
      request,
      options.authService,
      options.env.SESSION_COOKIE_NAME
    );
    const input = updateProfileSchema.safeParse(request.body);

    if (!input.success) {
      throw new AppError(
        "Revise os dados do perfil.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const user = await options.authService.updateProfile(
      currentUser.id,
      input.data
    );

    return { user };
  });
};
