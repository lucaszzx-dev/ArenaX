import { apiRequest } from "../../lib/api";
import type { Championship } from "./championship-api";
import type { ArenaMatch, MatchEntry, Standing } from "../matches/match-api";
import type { MatchEvent } from "../matches/match-event-api";
import type { MatchPeriod } from "../matches/match-period-api";

export type PublicChampionship = Omit<
  Championship,
  "organizerId" | "createdAt" | "updatedAt"
>;

export type PublicChampionshipOverview = {
  championship: PublicChampionship;
  entries: MatchEntry[];
  matches: ArenaMatch[];
  standings: Standing[];
  statistics: PlayerStatistic[];
};

export type PlayerStatistic = {
  teamMemberId: string | null;
  entryId: string;
  actorName: string;
  goals: number;
  points: number;
  aces: number;
  blocks: number;
  yellowCards: number;
  redCards: number;
  events: number;
};

export type PublicChampionshipCard = Pick<
  PublicChampionship,
  | "id"
  | "name"
  | "slug"
  | "sport"
  | "description"
  | "entryType"
  | "status"
  | "startsAt"
  | "endsAt"
>;

export type PublicChampionshipCatalog = {
  items: PublicChampionshipCard[];
  total: number;
  page: number;
  limit: number;
};

export const listPublicChampionships = (filters: URLSearchParams) =>
  apiRequest<PublicChampionshipCatalog>(
    `/public/championships?${filters.toString()}`
  );

export const getPublicChampionship = (slug: string) =>
  apiRequest<PublicChampionshipOverview>(`/public/championships/${slug}`);

export const getPublicMatch = (slug: string, matchId: string) =>
  apiRequest<{
    championship: Pick<PublicChampionship, "id" | "name" | "slug" | "sport">;
    match: ArenaMatch;
    events: MatchEvent[];
    periods: MatchPeriod[];
  }>(`/public/championships/${slug}/matches/${matchId}`);
