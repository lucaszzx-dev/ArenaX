import { and, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { groupStageEntries, matches } from "../db/schema.js";
import type { GroupAssignment, GroupStageRepository } from "./group-stage-repository.js";
import type { Match } from "../matches/match-repository.js";

export class DrizzleGroupStageRepository implements GroupStageRepository {
  constructor(private readonly db: Database) {}
  async list(championshipId: string): Promise<GroupAssignment[]> {
    return this.db.select({ entryId: groupStageEntries.entryId, groupNumber: groupStageEntries.groupNumber }).from(groupStageEntries).where(eq(groupStageEntries.championshipId, championshipId));
  }
  async replace(championshipId: string, assignments: GroupAssignment[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(groupStageEntries).where(eq(groupStageEntries.championshipId, championshipId));
      if (assignments.length) await tx.insert(groupStageEntries).values(assignments.map((item) => ({ championshipId, ...item })));
    });
  }
  async listGroupMatches(championshipId: string): Promise<Match[]> {
    const rows = await this.db.select().from(matches).where(and(eq(matches.championshipId, championshipId), eq(matches.phase, "GROUP")));
    // MatchService owns the entry hydration. This method is only used for completion checks.
    return rows as unknown as Match[];
  }
}
