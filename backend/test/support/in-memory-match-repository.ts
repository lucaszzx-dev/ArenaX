import type {
  CreateMatchInput,
  Match,
  MatchEntry,
  MatchRepository
} from "../../src/matches/match-repository.js";

export class InMemoryMatchRepository implements MatchRepository {
  readonly entries: MatchEntry[] = [];
  readonly matches: Match[] = [];

  async listEntries(championshipId: string) {
    return this.entries.filter((entry) => entry.championshipId === championshipId);
  }

  async findEntry(entryId: string) {
    return this.entries.find((entry) => entry.id === entryId) ?? null;
  }

  async listByChampionship(championshipId: string) {
    return this.matches.filter((match) => match.championshipId === championshipId);
  }

  async findById(matchId: string) {
    return this.matches.find((match) => match.id === matchId) ?? null;
  }

  async create(input: CreateMatchInput) {
    const homeEntry = this.entries.find((entry) => entry.id === input.homeEntryId);
    const awayEntry = this.entries.find((entry) => entry.id === input.awayEntryId);
    if (!homeEntry || !awayEntry) throw new Error("Adversário não encontrado.");
    const now = new Date();
    const match: Match = {
      ...input,
      id: crypto.randomUUID(),
      status: "SCHEDULED",
      homeScore: null,
      awayScore: null,
      createdAt: now,
      updatedAt: now,
      homeEntry,
      awayEntry
    };
    this.matches.push(match);
    return match;
  }

  async delete(championshipId: string, matchId: string) {
    const index = this.matches.findIndex(
      (match) => match.id === matchId && match.championshipId === championshipId
    );
    if (index < 0) return false;
    this.matches.splice(index, 1);
    return true;
  }
}
