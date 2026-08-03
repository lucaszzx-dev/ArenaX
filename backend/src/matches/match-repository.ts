export type MatchEntry = {
  id: string;
  championshipId: string;
  displayName: string;
  kind?: "INDIVIDUAL" | "TEAM";
  teamId?: string | null;
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
  roundNumber: number | null;
  generated: boolean;
  mvpId: string | null;
  venue: string | null;
  referee: string | null;
  operationalNotes: string | null;
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
  roundNumber?: number | null;
  generated?: boolean;
};

export type Standing = {
  entryId: string;
  position: number;
  displayName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
  points: number;
};

export interface MatchRepository {
  listEntries(championshipId: string): Promise<MatchEntry[]>;
  findEntry(entryId: string): Promise<MatchEntry | null>;
  findTeamMember(memberId: string): Promise<{ id: string; teamId: string; displayName: string } | null>;
  listByChampionship(championshipId: string): Promise<Match[]>;
  findById(matchId: string): Promise<Match | null>;
  create(input: CreateMatchInput): Promise<Match>;
  createMany(inputs: CreateMatchInput[]): Promise<Match[]>;
  updateScore(
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<Match>;
  updateSchedule(matchId: string, scheduledAt: Date | null): Promise<Match>;
  updateStatus(
    matchId: string,
    status: MatchStatus,
    clearScore: boolean
  ): Promise<Match>;
  delete(championshipId: string, matchId: string): Promise<boolean>;
  updateMvp(matchId: string, mvpId: string | null): Promise<Match>;
}