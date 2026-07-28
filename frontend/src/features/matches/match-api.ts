import { apiRequest } from "../../lib/api";

export type MatchEntry = {
  id: string;
  championshipId: string;
  displayName: string;
};

export type ArenaMatch = {
  id: string;
  championshipId: string;
  homeEntryId: string;
  awayEntryId: string;
  scheduledAt: string | null;
  status: "SCHEDULED" | "FINISHED" | "CANCELED";
  homeScore: number | null;
  awayScore: number | null;
  homeEntry: MatchEntry;
  awayEntry: MatchEntry;
};

export type MatchList = {
  entries: MatchEntry[];
  matches: ArenaMatch[];
};

export const matchQueryKey = (championshipId: string) => [
  "championships",
  championshipId,
  "matches"
];

export const listMatches = (championshipId: string) =>
  apiRequest<MatchList>(`/championships/${championshipId}/matches`);

export const createMatch = (
  championshipId: string,
  input: {
    homeEntryId: string;
    awayEntryId: string;
    scheduledAt: string | null;
  }
) =>
  apiRequest<{ match: ArenaMatch }>(
    `/championships/${championshipId}/matches`,
    { method: "POST", body: JSON.stringify(input) }
  );

export const deleteMatch = (championshipId: string, matchId: string) =>
  apiRequest<void>(`/championships/${championshipId}/matches/${matchId}`, {
    method: "DELETE"
  });
