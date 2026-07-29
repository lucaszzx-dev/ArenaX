import { apiRequest } from "../../lib/api";

export type MatchPeriod = {
  id: string;
  matchId: string;
  periodNumber: number;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
};

export const matchPeriodQueryKey = (championshipId: string, matchId: string) =>
  ["championships", championshipId, "matches", matchId, "periods"];

export const listMatchPeriods = (championshipId: string, matchId: string) =>
  apiRequest<{ periods: MatchPeriod[] }>(
    `/championships/${championshipId}/matches/${matchId}/periods`
  );

export const saveMatchPeriod = (
  championshipId: string,
  matchId: string,
  input: Pick<MatchPeriod, "periodNumber" | "homeScore" | "awayScore">
) =>
  apiRequest<{ period: MatchPeriod }>(
    `/championships/${championshipId}/matches/${matchId}/periods`,
    { method: "PUT", body: JSON.stringify(input) }
  );

export const deleteMatchPeriod = (
  championshipId: string,
  matchId: string,
  periodNumber: number
) =>
  apiRequest<void>(
    `/championships/${championshipId}/matches/${matchId}/periods/${periodNumber}`,
    { method: "DELETE" }
  );
