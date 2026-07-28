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
