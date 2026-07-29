import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { knockoutNodes, matches } from "../db/schema.js";
import { AppError } from "../errors/app-error.js";
import type {
  KnockoutRepository,
  SaveKnockoutNode
} from "./knockout-repository.js";

export class DrizzleKnockoutRepository implements KnockoutRepository {
  constructor(private readonly db: Database) {}

  list(championshipId: string) {
    return this.db
      .select()
      .from(knockoutNodes)
      .where(eq(knockoutNodes.championshipId, championshipId))
      .orderBy(asc(knockoutNodes.roundNumber), asc(knockoutNodes.position));
  }

  async createBracket(championshipId: string, nodes: SaveKnockoutNode[]) {
    await this.db.transaction(async (transaction) => {
      const created = await transaction
        .insert(knockoutNodes)
        .values(nodes.map((node) => ({ championshipId, ...node })))
        .returning();

      for (const node of created) {
        if (!node.homeEntryId || !node.awayEntryId) continue;
        const [match] = await transaction
          .insert(matches)
          .values({
            championshipId,
            homeEntryId: node.homeEntryId,
            awayEntryId: node.awayEntryId,
            roundNumber: node.roundNumber,
            generated: true
          })
          .returning();
        if (!match) throw new Error("Não foi possível criar o confronto.");
        await transaction
          .update(knockoutNodes)
          .set({ matchId: match.id, updatedAt: new Date() })
          .where(eq(knockoutNodes.id, node.id));
      }
    });
    return this.list(championshipId);
  }

  async advanceWinner(matchId: string, winnerEntryId: string) {
    await this.db.transaction(async (transaction) => {
      const [source] = await transaction
        .select()
        .from(knockoutNodes)
        .where(eq(knockoutNodes.matchId, matchId));
      if (!source) return;

      const nextRound = source.roundNumber + 1;
      const nextPosition = Math.ceil(source.position / 2);
      const [next] = await transaction
        .select()
        .from(knockoutNodes)
        .where(and(
          eq(knockoutNodes.championshipId, source.championshipId),
          eq(knockoutNodes.roundNumber, nextRound),
          eq(knockoutNodes.position, nextPosition)
        ));
      if (!next) return;

      const target = source.position % 2 === 1 ? "homeEntryId" : "awayEntryId";
      const [updated] = await transaction
        .update(knockoutNodes)
        .set({ [target]: winnerEntryId, updatedAt: new Date() })
        .where(eq(knockoutNodes.id, next.id))
        .returning();
      if (!updated || updated.matchId || !updated.homeEntryId || !updated.awayEntryId) {
        return;
      }

      const [nextMatch] = await transaction
        .insert(matches)
        .values({
          championshipId: source.championshipId,
          homeEntryId: updated.homeEntryId,
          awayEntryId: updated.awayEntryId,
          roundNumber: updated.roundNumber,
          generated: true
        })
        .returning();
      if (!nextMatch) throw new Error("Não foi possível avançar o vencedor.");
      await transaction
        .update(knockoutNodes)
        .set({ matchId: nextMatch.id, updatedAt: new Date() })
        .where(eq(knockoutNodes.id, next.id));
    });
  }

  async prepareReopen(matchId: string) {
    await this.db.transaction(async (transaction) => {
      const [source] = await transaction
        .select()
        .from(knockoutNodes)
        .where(eq(knockoutNodes.matchId, matchId));
      if (!source) return;
      const [next] = await transaction
        .select()
        .from(knockoutNodes)
        .where(and(
          eq(knockoutNodes.championshipId, source.championshipId),
          eq(knockoutNodes.roundNumber, source.roundNumber + 1),
          eq(knockoutNodes.position, Math.ceil(source.position / 2))
        ));
      if (!next) return;
      if (next.matchId) {
        throw new AppError(
          "Não é possível reabrir: a partida da fase seguinte já foi formada.",
          409,
          "NEXT_KNOCKOUT_MATCH_ALREADY_CREATED"
        );
      }
      const target = source.position % 2 === 1 ? "homeEntryId" : "awayEntryId";
      await transaction
        .update(knockoutNodes)
        .set({ [target]: null, updatedAt: new Date() })
        .where(eq(knockoutNodes.id, next.id));
    });
  }
}
