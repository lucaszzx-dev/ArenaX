import { apiRequest } from "../../lib/api";

export type FootballMatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD";

export type MatchEvent = {
  id: string;
  matchId: string;
  entryId: string;
  teamMemberId: string | null;
  actorName: string | null;
  type: FootballMatchEventType;
  value: number;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
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

export const createMatchEvent = (
  championshipId: string,
  matchId: string,
  input: {
    entryId: string;
    teamMemberId: string | null;
    type: FootballMatchEventType;
    periodNumber: number | null;
    clockSeconds: number | null;
    notes: string | null;
  }
) =>
  apiRequest<{ event: MatchEvent }>(
    `/championships/${championshipId}/matches/${matchId}/events`,
    { method: "POST", body: JSON.stringify(input) }
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
