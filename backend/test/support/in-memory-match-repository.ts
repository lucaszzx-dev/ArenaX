import type {
  CreateMatchInput,
  Match,
  MatchEntry,
  MatchRepository
} from "../../src/matches/match-repository.js";

export class InMemoryMatchRepository implements MatchRepository {
  readonly entries: MatchEntry[] = [];
  readonly matches: Match[] = [];
  readonly members: Array<{ id: string; teamId: string; displayName: string }> = [];


  async listEntries(championshipId: string) {
    return this.entries.filter((entry) => entry.championshipId === championshipId);
  }

  async findTeamMember(memberId: string) {
    return this.members.find((m) => m.id === memberId) ?? null;
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
      roundNumber: input.roundNumber ?? null,
      generated: input.generated ?? false,
      venue: null,
      referee: null,
      mvpId: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry,
      awayEntry
    };
    this.matches.push(match);
    return match;
  }

  async createMany(inputs: CreateMatchInput[]) {
    return Promise.all(inputs.map((input) => this.create(input)));
  }

  async updateScore(matchId: string, homeScore: number, awayScore: number) {
    const match = this.matches.find((item) => item.id === matchId);
    if (!match) throw new Error("Partida não encontrada.");
    Object.assign(match, {
      homeScore,
      awayScore,
      status: "FINISHED" as const,
      updatedAt: new Date()
    });
    return match;
  }

  async updateSchedule(matchId: string, scheduledAt: Date | null) {
    const match = this.matches.find((item) => item.id === matchId);
    if (!match) throw new Error("Partida não encontrada.");
    match.scheduledAt = scheduledAt;
    match.updatedAt = new Date();
    return match;
  }

  async updateStatus(
    matchId: string,
    status: Match["status"],
    clearScore: boolean
  ) {
    const match = this.matches.find((item) => item.id === matchId);
    if (!match) throw new Error("Partida não encontrada.");
    match.status = status;
    if (clearScore) {
      match.homeScore = null;
      match.awayScore = null;
    }
    match.updatedAt = new Date();
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
  async updateMvp(matchId: string, mvpId: string | null) {
    const match = this.matches.find((item) => item.id === matchId);
    if (!match) throw new Error("Partida não encontrada.");
    match.mvpId = mvpId;
    match.updatedAt = new Date();
    return match;
  }
}
