import { apiRequest } from "../../lib/api";
import type { ArenaMatch, MatchEntry } from "../matches/match-api";

export type KnockoutNode = {
  id: string;
  championshipId: string;
  roundNumber: number;
  position: number;
  homeEntryId: string | null;
  awayEntryId: string | null;
  matchId: string | null;
};

export type Bracket = {
  nodes: KnockoutNode[];
  entries: MatchEntry[];
  matches: ArenaMatch[];
};

export const bracketQueryKey = (championshipId: string) => [
  "championships",
  championshipId,
  "bracket"
];

export const getBracket = (championshipId: string) =>
  apiRequest<Bracket>(`/championships/${championshipId}/bracket`);

export const generateBracket = (championshipId: string) =>
  apiRequest<{
    nodes: KnockoutNode[];
    totalRounds: number;
    bracketSize: number;
    byes: number;
  }>(`/championships/${championshipId}/bracket/generate`, { method: "POST" });

export const setupFirstRound = (
  championshipId: string,
  pairings: Array<{ homeEntryId: string | null; awayEntryId: string | null }>,
  thirdPlace?: boolean
) =>
  apiRequest<{
    nodes: KnockoutNode[];
    totalRounds: number;
    bracketSize: number;
    byes: number;
  }>(`/championships/${championshipId}/bracket/manual`, {
    method: "POST",
    body: JSON.stringify({ pairings, thirdPlace })
  });


export const getPublicBracket = (slug: string) =>
  apiRequest<Bracket>(`/public/championships/${slug}/bracket`);
