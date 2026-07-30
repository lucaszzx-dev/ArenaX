import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  championshipEntries,
  matchLineups,
  matches,
  teamMembers
} from "../db/schema.js";
import type {
  MatchMetadata,
  MatchOperationRepository
} from "./match-operation-repository.js";

export class DrizzleMatchOperationRepository implements MatchOperationRepository {
  constructor(private readonly db: Database) {}

  async getMetadata(matchId: string) {
    const [match] = await this.db
      .select({
        venue: matches.venue,
        referee: matches.referee,
        operationalNotes: matches.operationalNotes
      })
      .from(matches)
      .where(eq(matches.id, matchId));
    return match ?? null;
  }

  async updateMetadata(matchId: string, input: MatchMetadata) {
    const [match] = await this.db
      .update(matches)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(matches.id, matchId))
      .returning({
        venue: matches.venue,
        referee: matches.referee,
        operationalNotes: matches.operationalNotes
      });
    if (!match) throw new Error("Partida não encontrada.");
    return match;
  }

  async listLineup(matchId: string) {
    return this.db
      .select({
        id: matchLineups.id,
        matchId: matchLineups.matchId,
        entryId: matchLineups.entryId,
        teamMemberId: matchLineups.teamMemberId,
        role: matchLineups.role,
        displayName: teamMembers.displayName,
        jerseyNumber: teamMembers.jerseyNumber,
        position: teamMembers.position,
        createdAt: matchLineups.createdAt
      })
      .from(matchLineups)
      .innerJoin(teamMembers, eq(teamMembers.id, matchLineups.teamMemberId))
      .where(eq(matchLineups.matchId, matchId))
      .orderBy(asc(matchLineups.role), asc(teamMembers.displayName));
  }

  async replaceLineup(
    matchId: string,
    entryId: string,
    players: Array<{
      teamMemberId: string;
      role: "STARTER" | "SUBSTITUTE";
    }>
  ) {
    await this.db.transaction(async (transaction) => {
      await transaction
        .delete(matchLineups)
        .where(and(
          eq(matchLineups.matchId, matchId),
          eq(matchLineups.entryId, entryId)
        ));
      if (players.length) {
        await transaction.insert(matchLineups).values(
          players.map((player) => ({ matchId, entryId, ...player }))
        );
      }
    });
    return this.listLineup(matchId);
  }

  async findEntryTeam(entryId: string) {
    const [entry] = await this.db
      .select({ teamId: championshipEntries.teamId })
      .from(championshipEntries)
      .where(eq(championshipEntries.id, entryId));
    return entry?.teamId ?? null;
  }

  async listValidMemberIds(teamId: string) {
    const members = await this.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    return members.map((member) => member.id);
  }
}
