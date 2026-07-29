import { apiRequest } from "../../lib/api";

export type ClubMember = {
  id: string;
  clubId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type Club = {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  members: ClubMember[];
};

export const clubsQueryKey = ["clubs"] as const;

export const listClubs = () => apiRequest<{ clubs: Club[] }>("/clubs");

export const createClub = (input: {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}) => apiRequest<{ club: Club }>("/clubs", {
  method: "POST",
  body: JSON.stringify(input)
});

export const updateClub = (
  clubId: string,
  input: { name: string; shortName: string | null; logoUrl: string | null }
) => apiRequest<{ club: Club }>(`/clubs/${clubId}`, {
  method: "PUT",
  body: JSON.stringify(input)
});

export const deleteClub = (clubId: string) =>
  apiRequest<void>(`/clubs/${clubId}`, { method: "DELETE" });

export const addClubMember = (
  clubId: string,
  input: {
    displayName: string;
    jerseyNumber: number | null;
    position: string | null;
  }
) => apiRequest(`/clubs/${clubId}/members`, {
  method: "POST",
  body: JSON.stringify(input)
});

export const deleteClubMember = (clubId: string, memberId: string) =>
  apiRequest<void>(`/clubs/${clubId}/members/${memberId}`, { method: "DELETE" });

export const setClubCaptain = (clubId: string, memberId: string) =>
  apiRequest(`/clubs/${clubId}/captain`, {
    method: "PUT",
    body: JSON.stringify({ memberId })
  });

export const importClub = (clubId: string, championshipId: string) =>
  apiRequest<{ teamId: string }>(`/clubs/${clubId}/import/${championshipId}`, {
    method: "POST"
  });
