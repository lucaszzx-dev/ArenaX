import type { FastifyPluginAsync } from "fastify";

type HealthRoutesOptions = {
  checkDatabase?: () => Promise<void>;
};

export const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (
  app,
  options
) => {
  const healthHandler = async () => {
    if (options.checkDatabase) {
      try {
        await options.checkDatabase();
      } catch {
        return { status: "degraded", database: "unreachable" };
      }
    }

    return {
      status: "ok",
      database: options.checkDatabase ? "ok" : "skipped"
    };
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);
};
