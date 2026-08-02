import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AuthService } from "../auth/auth-service.js";
import { requireUser } from "../auth/require-user.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { NotificationService } from "../notifications/notification-service.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
const notificationParamsSchema = z.object({ notificationId: z.uuid() });

type NotificationRoutesOptions = {
  authService: AuthService;
  notificationService: NotificationService;
  env: Env;
};

export const notificationRoutes: FastifyPluginAsync<
  NotificationRoutesOptions
> = async (app, options) => {
  async function getUser(request: Parameters<typeof requireUser>[0]) {
    return requireUser(
      request,
      options.authService,
      options.env.SESSION_COOKIE_NAME
    );
  }

  app.get("/notifications", async (request) => {
    const user = await getUser(request);
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) throw validationError();
    const page = await options.notificationService.list(
      user.id,
      query.data.page,
      query.data.limit
    );
    return page;
  });

  app.get("/notifications/unread-count", async (request) => {
    const user = await getUser(request);
    const unread = await options.notificationService.unreadCount(user.id);
    return { unread };
  });

  app.put("/notifications/:notificationId/read", async (request) => {
    const user = await getUser(request);
    const params = notificationParamsSchema.safeParse(request.params);
    if (!params.success) throw validationError();
    const notification = await options.notificationService.markRead(
      user.id,
      params.data.notificationId
    );
    return { notification };
  });

  app.put("/notifications/read-all", async (request) => {
    const user = await getUser(request);
    const updated = await options.notificationService.markAllRead(user.id);
    return { updated };
  });
};

function validationError() {
  return new AppError("Revise os dados informados.", 400, "VALIDATION_ERROR");
}
