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
  roundNumber: number | null;
  generated: boolean;
  mvpId: string | null;
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

export const generateLeagueMatches = (
  championshipId: string,
  input: { legs: 1 | 2; startsAt: string | null; intervalDays: number }
) => apiRequest<{ matches: ArenaMatch[]; rounds: number; total: number }>(
  `/championships/${championshipId}/matches/generate`,
  { method: "POST", body: JSON.stringify(input) }
);

export const updateMatchMvp = (
  championshipId: string,
  matchId: string,
  mvpId: string | null
) =>
  apiRequest<{ match: ArenaMatch }>(
    `/championships/${championshipId}/matches/${matchId}/mvp`,
    { method: "PUT", body: JSON.stringify({ mvpId }) }
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

export type MatchAuditLog = {
  id: string;
  matchId: string;
  actorId: string;
  action: "SCORE_CHANGED" | "MATCH_CANCELED" | "MATCH_REOPENED";
  details: Record<string, unknown>;
  createdAt: string;
};

export const listMatchAudit = (championshipId: string, matchId: string) =>
  apiRequest<{ logs: MatchAuditLog[] }>(
    `/championships/${championshipId}/matches/${matchId}/audit`
  );
