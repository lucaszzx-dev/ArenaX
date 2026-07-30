import { apiRequest } from "../../lib/api";

export type LineupRole = "STARTER" | "SUBSTITUTE";

export type MatchMetadata = {
  venue: string | null;
  referee: string | null;
  operationalNotes: string | null;
};

export type MatchLineupItem = {
  id: string;
  matchId: string;
  entryId: string;
  teamMemberId: string;
  role: LineupRole;
  createdAt: string;
};

export type MatchOperations = {
  metadata: MatchMetadata | null;
  lineup: MatchLineupItem[];
};

export const matchOperationsQueryKey = (
  championshipId: string,
  matchId: string
) => ["championships", championshipId, "matches", matchId, "operations"];

export const getMatchOperations = (
  championshipId: string,
  matchId: string
) =>
  apiRequest<MatchOperations>(
    `/championships/${championshipId}/matches/${matchId}/operations`
  );

export const updateMatchMetadata = (
  championshipId: string,
  matchId: string,
  input: MatchMetadata
) =>
  apiRequest<{ metadata: MatchMetadata }>(
    `/championships/${championshipId}/matches/${matchId}/operations/metadata`,
    { method: "PUT", body: JSON.stringify(input) }
  );

export const replaceMatchLineup = (
  championshipId: string,
  matchId: string,
  input: {
    entryId: string;
    players: Array<{ teamMemberId: string; role: LineupRole }>;
  }
) =>
  apiRequest<{ lineup: MatchLineupItem[] }>(
    `/championships/${championshipId}/matches/${matchId}/operations/lineup`,
    { method: "PUT", body: JSON.stringify(input) }
  );
