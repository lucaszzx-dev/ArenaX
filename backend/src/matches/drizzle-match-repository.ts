import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { championshipEntries, matches } from "../db/schema.js";
import type {
  CreateMatchInput,
  Match,
  MatchEntry,
  MatchRepository
} from "./match-repository.js";

export class DrizzleMatchRepository implements MatchRepository {
  constructor(private readonly db: Database) {}

  listEntries(championshipId: string): Promise<MatchEntry[]> {
    return this.db
      .select({
        id: championshipEntries.id,
        championshipId: championshipEntries.championshipId,
        displayName: championshipEntries.displayName,
        kind: championshipEntries.kind,
        teamId: championshipEntries.teamId
      })
      .from(championshipEntries)
      .where(eq(championshipEntries.championshipId, championshipId))
      .orderBy(asc(championshipEntries.displayName));
  }

  async findEntry(entryId: string): Promise<MatchEntry | null> {
    const [entry] = await this.db
      .select({
        id: championshipEntries.id,
        championshipId: championshipEntries.championshipId,
        displayName: championshipEntries.displayName,
        kind: championshipEntries.kind,
        teamId: championshipEntries.teamId
      })
      .from(championshipEntries)
      .where(eq(championshipEntries.id, entryId));

    return entry ?? null;
  }

  async listByChampionship(championshipId: string): Promise<Match[]> {
    const rows = await this.db
      .select()
      .from(matches)
      .where(eq(matches.championshipId, championshipId))
      .orderBy(asc(matches.scheduledAt), asc(matches.createdAt));

    return Promise.all(rows.map((match) => this.withEntries(match)));
  }

  async findById(matchId: string): Promise<Match | null> {
    const [match] = await this.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId));

    return match ? this.withEntries(match) : null;
  }

  async create(input: CreateMatchInput): Promise<Match> {
    const [match] = await this.db.insert(matches).values(input).returning();
    if (!match) throw new Error("Não foi possível criar a partida.");
    return this.withEntries(match);
  }

  async createMany(inputs: CreateMatchInput[]): Promise<Match[]> {
    if (!inputs.length) return [];
    const rows = await this.db.insert(matches).values(inputs).returning();
    return Promise.all(rows.map((match) => this.withEntries(match)));
  }

  async updateScore(matchId: string, homeScore: number, awayScore: number) {
    const [match] = await this.db
      .update(matches)
      .set({
        homeScore,
        awayScore,
        status: "FINISHED",
        updatedAt: new Date()
      })
      .where(eq(matches.id, matchId))
      .returning();
    if (!match) throw new Error("Não foi possível registrar o placar.");
    return this.withEntries(match);
  }

  async updateSchedule(matchId: string, scheduledAt: Date | null) {
    const [match] = await this.db
      .update(matches)
      .set({ scheduledAt, updatedAt: new Date() })
      .where(eq(matches.id, matchId))
      .returning();
    if (!match) throw new Error("Não foi possível alterar o agendamento.");
    return this.withEntries(match);
  }

  async updateStatus(
    matchId: string,
    status: Match["status"],
    clearScore: boolean
  ) {
    const [match] = await this.db
      .update(matches)
      .set({
        status,
        ...(clearScore ? { homeScore: null, awayScore: null } : {}),
        updatedAt: new Date()
      })
      .where(eq(matches.id, matchId))
      .returning();
    if (!match) throw new Error("Não foi possível alterar a partida.");
    return this.withEntries(match);
  }

  async delete(championshipId: string, matchId: string) {
    const deleted = await this.db
      .delete(matches)
      .where(and(
        eq(matches.id, matchId),
        eq(matches.championshipId, championshipId)
      ))
      .returning({ id: matches.id });
    return deleted.length > 0;
  }

  private async withEntries(
    match: typeof matches.$inferSelect
  ): Promise<Match> {
    const [homeEntry, awayEntry] = await Promise.all([
      this.findEntry(match.homeEntryId),
      this.findEntry(match.awayEntryId)
    ]);
    if (!homeEntry || !awayEntry) {
      throw new Error("A partida possui adversários inválidos.");
    }
    return { ...match, homeEntry, awayEntry };
  }
}
