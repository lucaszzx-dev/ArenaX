import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/require-user.js";
import type { AuthService } from "../auth/auth-service.js";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { GroupStageService } from "../group-stage/group-stage-service.js";
import type { ChampionshipService } from "../championships/championship-service.js";

const id = z.object({ id: z.uuid() });
export const groupStageRoutes: FastifyPluginAsync<{ authService: AuthService; championshipService: ChampionshipService; groupStageService: GroupStageService; env: Env }> = async (app, options) => {
  const user = (request: Parameters<typeof requireUser>[0]) => requireUser(request, options.authService, options.env.SESSION_COOKIE_NAME);
  app.post("/championships/:id/groups/generate", async (request, reply) => { const current=await user(request); const params=id.safeParse(request.params); if(!params.success) throw invalid(); return reply.status(201).send(await options.groupStageService.generate(current.id, params.data.id)); });
  app.get("/championships/:id/groups", async (request) => { const current=await user(request); const params=id.safeParse(request.params); if(!params.success) throw invalid(); return options.groupStageService.overview(current.id, params.data.id); });
  app.post("/championships/:id/groups/bracket", async (request, reply) => { const current=await user(request); const params=id.safeParse(request.params); if(!params.success) throw invalid(); return reply.status(201).send(await options.groupStageService.generateBracket(current.id, params.data.id)); });
  app.get("/public/championships/:slug/groups", async (request) => { const params=z.object({slug:z.string().min(1)}).safeParse(request.params); if(!params.success) throw invalid(); const championship=await options.championshipService.getPublic(params.data.slug); if(championship.format!=="GROUP_KNOCKOUT") throw new AppError("Esta competição não usa grupos e mata-mata.",409,"CHAMPIONSHIP_IS_NOT_GROUP_KNOCKOUT"); return options.groupStageService.publicOverview(championship.id); });
};
function invalid(){ return new AppError("Identificador inválido.",400,"VALIDATION_ERROR"); }
