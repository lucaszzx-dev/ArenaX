import { asc, eq } from "drizzle-orm";

import type { ChampionshipService } from "../championships/championship-service.js";
import type { Database } from "../db/client.js";
import { matchAuditLogs } from "../db/schema.js";
import { AppError } from "../errors/app-error.js";
import type { MatchRepository } from "../matches/match-repository.js";

export type MatchAuditAction =
  | "SCORE_CHANGED"
  | "MATCH_CANCELED"
  | "MATCH_REOPENED"
  | "MATCH_METADATA_CHANGED"
  | "MATCH_LINEUP_CHANGED"
  | "MATCH_EVENT_CREATED"
  | "MATCH_EVENT_CHANGED"
  | "MATCH_EVENT_DELETED";

export class MatchAuditService {
  constructor(
    private readonly db: Database,
    private readonly matches: MatchRepository,
    private readonly championships: ChampionshipService
  ) {}

  async record(
    actorId: string,
    matchId: string,
    action: MatchAuditAction,
    details: Record<string, unknown>
  ) {
    await this.db.insert(matchAuditLogs).values({ actorId, matchId, action, details });
  }

  async list(actorId: string, championshipId: string, matchId: string) {
    await this.championships.getMine(actorId, championshipId);
    const match = await this.matches.findById(matchId);
    if (!match || match.championshipId !== championshipId) {
      throw new AppError("Partida não encontrada.", 404, "MATCH_NOT_FOUND");
    }
    return this.db
      .select()
      .from(matchAuditLogs)
      .where(eq(matchAuditLogs.matchId, matchId))
      .orderBy(asc(matchAuditLogs.createdAt));
  }
}
