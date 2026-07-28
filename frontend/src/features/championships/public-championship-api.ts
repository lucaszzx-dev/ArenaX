import { apiRequest } from "../../lib/api";
import type { Championship } from "./championship-api";
import type { ArenaMatch, MatchEntry, Standing } from "../matches/match-api";

export type PublicChampionship = Omit<
  Championship,
  "organizerId" | "createdAt" | "updatedAt"
>;

export type PublicChampionshipOverview = {
  championship: PublicChampionship;
  entries: MatchEntry[];
  matches: ArenaMatch[];
  standings: Standing[];
};

export const getPublicChampionship = (slug: string) =>
  apiRequest<PublicChampionshipOverview>(`/public/championships/${slug}`);

export const getPublicMatch = (slug: string, matchId: string) =>
  apiRequest<{
    championship: Pick<PublicChampionship, "id" | "name" | "slug" | "sport">;
    match: ArenaMatch;
  }>(`/public/championships/${slug}/matches/${matchId}`);
