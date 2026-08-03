import { apiRequest } from "../../lib/api";

export type ChampionshipEntryType = "INDIVIDUAL" | "TEAM";
export type ChampionshipStatus = "DRAFT" | "PUBLISHED" | "FINISHED";
export type TournamentFormat = "LEAGUE" | "KNOCKOUT";

export type Championship = {
  id: string;
  organizerId: string;
  name: string;
  slug: string;
  sport: string;
  description: string | null;
  entryType: ChampionshipEntryType;
  status: ChampionshipStatus;
  format: TournamentFormat;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  allowsDraw: boolean;
  bestOfSets: number;
  thirdPlace: boolean;
  maxYellowCards: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChampionshipInput = {
  name: string;
  sport: string;
  description: string | null;
  entryType: ChampionshipEntryType;
  format: TournamentFormat;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  allowsDraw: boolean;
  bestOfSets: number;
  thirdPlace: boolean;
  maxYellowCards: number;
  startsAt: string | null;
  endsAt: string | null;
};

type ChampionshipResponse = {
  championship: Championship;
};

type ChampionshipListResponse = {
  championships: Championship[];
};

export function createChampionship(input: ChampionshipInput) {
  return apiRequest<ChampionshipResponse>("/championships", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listChampionships() {
  return apiRequest<ChampionshipListResponse>("/championships");
}

export function getChampionship(id: string) {
  return apiRequest<ChampionshipResponse>(`/championships/${id}`);
}

export function updateChampionship(id: string, input: ChampionshipInput) {
  return apiRequest<ChampionshipResponse>(`/championships/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function updateChampionshipStatus(
  id: string,
  status: ChampionshipStatus
) {
  return apiRequest<ChampionshipResponse>(`/championships/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });
}