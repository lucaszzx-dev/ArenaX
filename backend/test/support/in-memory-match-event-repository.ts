import { randomUUID } from "node:crypto";

import type {
  CreateMatchEventInput,
  MatchEvent,
  MatchEventEntry,
  MatchEventRepository,
  MatchEventTeamMember
} from "../../src/match-events/match-event-repository.js";

export class InMemoryMatchEventRepository implements MatchEventRepository {
  readonly events: MatchEvent[] = [];
  readonly entries: MatchEventEntry[] = [];
  readonly members: MatchEventTeamMember[] = [];

  async list(matchId: string) {
    return this.events.filter((event) => event.matchId === matchId);
  }

  async listByChampionship(championshipId: string) {
    const entryIds = new Set(
      this.entries
        .filter((entry) => entry.championshipId === championshipId)
        .map((entry) => entry.id)
    );
    return this.events.filter((event) => entryIds.has(event.entryId));
  }

  async findById(eventId: string) {
    return this.events.find((event) => event.id === eventId) ?? null;
  }

  async findEntry(entryId: string) {
    return this.entries.find((entry) => entry.id === entryId) ?? null;
  }

  async findTeamMember(memberId: string) {
    return this.members.find((member) => member.id === memberId) ?? null;
  }

  async create(input: CreateMatchEventInput) {
    const event: MatchEvent = {
      id: randomUUID(),
      createdAt: new Date(),
      ...input
    };
    this.events.push(event);
    return event;
  }

  async delete(eventId: string) {
    const index = this.events.findIndex((event) => event.id === eventId);
    if (index < 0) return false;
    this.events.splice(index, 1);
    return true;
  }
}
