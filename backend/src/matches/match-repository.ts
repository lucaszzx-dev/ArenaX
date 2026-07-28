export type MatchEntry = {
  id: string;
  championshipId: string;
  displayName: string;
};

export type MatchStatus = "SCHEDULED" | "FINISHED" | "CANCELED";

export type Match = {
  id: string;
  championshipId: string;
  homeEntryId: string;
  awayEntryId: string;
  scheduledAt: Date | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  homeEntry: MatchEntry;
  awayEntry: MatchEntry;
};

export type CreateMatchInput = {
  championshipId: string;
  homeEntryId: string;
  awayEntryId: string;
  scheduledAt: Date | null;
};

export interface MatchRepository {
  listEntries(championshipId: string): Promise<MatchEntry[]>;
  findEntry(entryId: string): Promise<MatchEntry | null>;
  listByChampionship(championshipId: string): Promise<Match[]>;
  findById(matchId: string): Promise<Match | null>;
  create(input: CreateMatchInput): Promise<Match>;
  delete(championshipId: string, matchId: string): Promise<boolean>;
}
