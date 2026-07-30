import { asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  championshipEntries,
  matchEvents,
  matches,
  teamMembers
} from "../db/schema.js";
import type {
  CreateMatchEventInput,
  MatchEvent,
  MatchEventEntry,
  MatchEventRepository,
  MatchEventTeamMember
} from "./match-event-repository.js";

export class DrizzleMatchEventRepository implements MatchEventRepository {
  constructor(private readonly db: Database) {}

  list(matchId: string): Promise<MatchEvent[]> {
    return this.db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(
        asc(matchEvents.periodNumber),
        asc(matchEvents.clockSeconds),
        asc(matchEvents.createdAt)
      ) as Promise<MatchEvent[]>;
  }

  listByChampionship(championshipId: string): Promise<MatchEvent[]> {
    return this.db
      .select({
        id: matchEvents.id,
        matchId: matchEvents.matchId,
        entryId: matchEvents.entryId,
        teamMemberId: matchEvents.teamMemberId,
        actorName: matchEvents.actorName,
        type: matchEvents.type,
        value: matchEvents.value,
        periodNumber: matchEvents.periodNumber,
        clockSeconds: matchEvents.clockSeconds,
        notes: matchEvents.notes,
        relatedEventId: matchEvents.relatedEventId,
        createdAt: matchEvents.createdAt
      })
      .from(matchEvents)
      .innerJoin(matches, eq(matches.id, matchEvents.matchId))
      .where(eq(matches.championshipId, championshipId))
      .orderBy(asc(matchEvents.createdAt)) as Promise<MatchEvent[]>;
  }

  async findById(eventId: string): Promise<MatchEvent | null> {
    const [event] = await this.db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.id, eventId));

    return (event as MatchEvent | undefined) ?? null;
  }

  async findEntry(entryId: string): Promise<MatchEventEntry | null> {
    const [entry] = await this.db
      .select({
        id: championshipEntries.id,
        championshipId: championshipEntries.championshipId,
        teamId: championshipEntries.teamId
      })
      .from(championshipEntries)
      .where(eq(championshipEntries.id, entryId));

    return entry ?? null;
  }

  async findTeamMember(
    memberId: string
  ): Promise<MatchEventTeamMember | null> {
    const [member] = await this.db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        displayName: teamMembers.displayName
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId));

    return member ?? null;
  }

  async create(input: CreateMatchEventInput): Promise<MatchEvent> {
    const [event] = await this.db
      .insert(matchEvents)
      .values(input)
      .returning();

    if (!event) throw new Error("Não foi possível registrar o evento.");

    return event as MatchEvent;
  }

  async update(eventId: string, input: CreateMatchEventInput): Promise<MatchEvent> {
    const [event] = await this.db
      .update(matchEvents)
      .set(input)
      .where(eq(matchEvents.id, eventId))
      .returning();
    if (!event) throw new Error("Não foi possível atualizar o evento.");
    return event as MatchEvent;
  }

  async delete(eventId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(matchEvents)
      .where(eq(matchEvents.id, eventId))
      .returning({ id: matchEvents.id });

    return deleted.length > 0;
  }
}
