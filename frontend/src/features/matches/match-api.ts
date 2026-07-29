import { apiRequest } from "../../lib/api";

export type MatchEntry = {
  id: string;
  championshipId: string;
  displayName: string;
  kind?: "INDIVIDUAL" | "TEAM";
  teamId?: string | null;
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

export const recordScore = (
  championshipId: string,
  matchId: string,
  homeScore: number,
  awayScore: number
) =>
  apiRequest<{ match: ArenaMatch }>(
    `/championships/${championshipId}/matches/${matchId}/score`,
    {
      method: "PUT",
      body: JSON.stringify({ homeScore, awayScore })
    }
  );

export const listStandings = (championshipId: string) =>
  apiRequest<{ standings: Standing[] }>(
    `/championships/${championshipId}/standings`
  );

export const updateMatchSchedule = (
  championshipId: string,
  matchId: string,
  scheduledAt: string | null
) =>
  apiRequest<{ match: ArenaMatch }>(
    `/championships/${championshipId}/matches/${matchId}/schedule`,
    {
      method: "PUT",
      body: JSON.stringify({ scheduledAt })
    }
  );

export const changeMatchStatus = (
  championshipId: string,
  matchId: string,
  action: "CANCEL" | "REOPEN"
) =>
  apiRequest<{ match: ArenaMatch }>(
    `/championships/${championshipId}/matches/${matchId}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ action })
    }
  );
