export type MatchPeriod = {
  id: string;
  matchId: string;
  periodNumber: number;
  homeScore: number;
  awayScore: number;
  createdAt: Date;
  updatedAt: Date;
};

export interface MatchPeriodRepository {
  list(matchId: string): Promise<MatchPeriod[]>;
  upsert(input: Omit<MatchPeriod, "id" | "createdAt" | "updatedAt">): Promise<MatchPeriod>;
  delete(matchId: string, periodNumber: number): Promise<boolean>;
}
