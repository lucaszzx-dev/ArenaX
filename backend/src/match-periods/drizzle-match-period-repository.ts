import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { matchPeriods } from "../db/schema.js";
import type {
  MatchPeriod,
  MatchPeriodRepository
} from "./match-period-repository.js";

export class DrizzleMatchPeriodRepository implements MatchPeriodRepository {
  constructor(private readonly db: Database) {}

  list(matchId: string): Promise<MatchPeriod[]> {
    return this.db
      .select()
      .from(matchPeriods)
      .where(eq(matchPeriods.matchId, matchId))
      .orderBy(asc(matchPeriods.periodNumber));
  }

  async upsert(
    input: Omit<MatchPeriod, "id" | "createdAt" | "updatedAt">
  ): Promise<MatchPeriod> {
    const [period] = await this.db
      .insert(matchPeriods)
      .values(input)
      .onConflictDoUpdate({
        target: [matchPeriods.matchId, matchPeriods.periodNumber],
        set: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          updatedAt: new Date()
        }
      })
      .returning();
    if (!period) throw new Error("Não foi possível salvar a parcial.");
    return period;
  }

  async delete(matchId: string, periodNumber: number) {
    const deleted = await this.db
      .delete(matchPeriods)
      .where(and(
        eq(matchPeriods.matchId, matchId),
        eq(matchPeriods.periodNumber, periodNumber)
      ))
      .returning({ id: matchPeriods.id });
    return deleted.length > 0;
  }
}
