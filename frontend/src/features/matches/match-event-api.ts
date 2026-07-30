import { apiRequest } from "../../lib/api";

export type MatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "FREE_THROW"
  | "TWO_POINT_SHOT"
  | "THREE_POINT_SHOT"
  | "VOLLEYBALL_POINT"
  | "ACE"
  | "BLOCK"
  | "ASSIST"
  | "SUBSTITUTION"
  | "PENALTY_CONVERTED"
  | "PENALTY_MISSED";

export type MatchEvent = {
  id: string;
  matchId: string;
  entryId: string;
  teamMemberId: string | null;
  actorName: string | null;
  type: MatchEventType;
  value: number;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
  relatedEventId: string | null;
  createdAt: string;
};

export const matchEventQueryKey = (
  championshipId: string,
  matchId: string
) => ["championships", championshipId, "matches", matchId, "events"];

export const listMatchEvents = (
  championshipId: string,
  matchId: string
) =>
  apiRequest<{ events: MatchEvent[] }>(
    `/championships/${championshipId}/matches/${matchId}/events`
  );

export const listSuspendedPlayers = (
  championshipId: string,
  matchId: string,
  entryId: string
) =>
  apiRequest<{ suspendedPlayerIds: string[] }>(
    `/championships/${championshipId}/matches/${matchId}/suspended-players?entryId=${entryId}`
  );

export const createMatchEvent = (
  championshipId: string,
  matchId: string,
  input: {
    entryId: string;
    teamMemberId: string | null;
    type: MatchEventType;
    periodNumber: number | null;
    clockSeconds: number | null;
    notes: string | null;
    relatedEventId?: string | null;
  }
) =>
  apiRequest<{ event: MatchEvent }>(
    `/championships/${championshipId}/matches/${matchId}/events`,
    { method: "POST", body: JSON.stringify(input) }
  );

export const updateMatchEvent = (
  championshipId: string,
  matchId: string,
  eventId: string,
  input: {
    entryId: string;
    teamMemberId: string | null;
    type: MatchEventType;
    periodNumber: number | null;
    clockSeconds: number | null;
    notes: string | null;
    relatedEventId?: string | null;
  }
) =>
  apiRequest<{ event: MatchEvent }>(
    `/championships/${championshipId}/matches/${matchId}/events/${eventId}`,
    { method: "PUT", body: JSON.stringify(input) }
  );

export const deleteMatchEvent = (
  championshipId: string,
  matchId: string,
  eventId: string
) =>
  apiRequest<void>(
    `/championships/${championshipId}/matches/${matchId}/events/${eventId}`,
    { method: "DELETE" }
  );