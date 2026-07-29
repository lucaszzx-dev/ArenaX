import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  const healthHandler = () => {
    return {
      status: "ok"
    };
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);
};
