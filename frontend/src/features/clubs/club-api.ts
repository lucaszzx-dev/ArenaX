import { apiRequest } from "../../lib/api";

export type ClubMember = {
  id: string;
  clubId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
  createdAt: string;
};

export type ClubSeason = {
  id: string;
  clubId: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type ClubSquadMember = {
  clubMemberId: string;
  role: string;
};

export type ClubSquad = {
  id: string;
  clubId: string;
  name: string;
  category: string | null;
  sport: string | null;
  seasonId: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  members: ClubSquadMember[];
};

export type ClubStaff = {
  id: string;
  clubId: string;
  displayName: string;
  role: string;
  createdAt: string;
};

export type Club = {
  id: string;
  ownerId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  homeKit: string | null;
  awayKit: string | null;
  createdAt: string;
  updatedAt: string;
  members: ClubMember[];
  seasons: ClubSeason[];
  squads: ClubSquad[];
  staff: ClubStaff[];
};

export type ClubIdentity = {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  homeKit?: string | null;
  awayKit?: string | null;
};

export type ImportedTeam = {
  id: string;
  championshipId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
};

export type TeamSyncDiff = {
  toAdd: Array<{
    clubMemberId: string;
    displayName: string;
    jerseyNumber: number | null;
    position: string | null;
    isCaptain: boolean;
  }>;
  toUpdate: Array<{
    teamMemberId: string;
    clubMemberId: string;
    sourceClubMemberId: string | null;
    displayName: string;
    jerseyNumber: number | null;
    position: string | null;
    isCaptain: boolean;
  }>;
  toRemove: Array<{ teamMemberId: string; displayName: string }>;
  protectedMembers: Array<{ teamMemberId: string; displayName: string }>;
  unchanged: number;
};

export type SyncPreview = {
  diff: TeamSyncDiff;
  team: { id: string; name: string };
};

export type RosterImportResult = {
  created: number;
  updated: number;
  skipped: number;
};

export const clubsQueryKey = ["clubs"] as const;

export const listClubs = () => apiRequest<{ clubs: Club[] }>("/clubs");

export const createClub = (input: ClubIdentity) =>
  apiRequest<{ club: Club }>("/clubs", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const updateClub = (clubId: string, input: ClubIdentity) =>
  apiRequest<{ club: Club }>("/clubs/" + clubId, {
    method: "PUT",
    body: JSON.stringify(input)
  });

export const deleteClub = (clubId: string) =>
  apiRequest<void>("/clubs/" + clubId, { method: "DELETE" });

export const addClubMember = (
  clubId: string,
  input: { displayName: string; jerseyNumber: number | null; position: string | null }
) => apiRequest<{ member: ClubMember }>("/clubs/" + clubId + "/members", {
  method: "POST",
  body: JSON.stringify(input)
});

export const updateClubMember = (
  clubId: string,
  memberId: string,
  input: { displayName: string; jerseyNumber: number | null; position: string | null }
) => apiRequest<{ member: ClubMember }>(
  "/clubs/" + clubId + "/members/" + memberId,
  { method: "PUT", body: JSON.stringify(input) }
);

export const deleteClubMember = (clubId: string, memberId: string) =>
  apiRequest<void>("/clubs/" + clubId + "/members/" + memberId, { method: "DELETE" });

export const setClubCaptain = (clubId: string, memberId: string) =>
  apiRequest<{ club: Club }>("/clubs/" + clubId + "/captain", {
    method: "PUT",
    body: JSON.stringify({ memberId })
  });

export const addClubSeason = (
  clubId: string,
  input: { name: string; startsAt: string | null; endsAt: string | null }
) => apiRequest<{ season: ClubSeason }>("/clubs/" + clubId + "/seasons", {
  method: "POST",
  body: JSON.stringify(input)
});

export const updateClubSeason = (
  clubId: string,
  seasonId: string,
  input: { name: string; startsAt: string | null; endsAt: string | null }
) => apiRequest<{ season: ClubSeason }>(
  "/clubs/" + clubId + "/seasons/" + seasonId,
  { method: "PUT", body: JSON.stringify(input) }
);

export const deleteClubSeason = (clubId: string, seasonId: string) =>
  apiRequest<void>("/clubs/" + clubId + "/seasons/" + seasonId, { method: "DELETE" });

export const addClubSquad = (
  clubId: string,
  input: {
    name: string;
    category: string | null;
    sport: string | null;
    seasonId: string | null;
    isPrimary: boolean;
  }
) => apiRequest<{ squad: ClubSquad }>("/clubs/" + clubId + "/squads", {
  method: "POST",
  body: JSON.stringify(input)
});

export const updateClubSquad = (
  clubId: string,
  squadId: string,
  input: {
    name: string;
    category: string | null;
    sport: string | null;
    seasonId: string | null;
    isPrimary: boolean;
  }
) => apiRequest<{ squad: ClubSquad }>(
  "/clubs/" + clubId + "/squads/" + squadId,
  { method: "PUT", body: JSON.stringify(input) }
);

export const deleteClubSquad = (clubId: string, squadId: string) =>
  apiRequest<void>("/clubs/" + clubId + "/squads/" + squadId, { method: "DELETE" });

export const setClubSquadMembers = (
  clubId: string,
  squadId: string,
  members: Array<{ clubMemberId: string; role: string }>
) => apiRequest<{ squad: ClubSquad }>(
  "/clubs/" + clubId + "/squads/" + squadId + "/members",
  { method: "PUT", body: JSON.stringify({ members }) }
);

export const addClubStaff = (
  clubId: string,
  input: { displayName: string; role: string }
) => apiRequest<{ staff: ClubStaff }>("/clubs/" + clubId + "/staff", {
  method: "POST",
  body: JSON.stringify(input)
});

export const deleteClubStaff = (clubId: string, staffId: string) =>
  apiRequest<void>("/clubs/" + clubId + "/staff/" + staffId, { method: "DELETE" });

export const importClubIntoChampionship = (
  clubId: string,
  championshipId: string,
  memberIds?: string[]
) => apiRequest<{ teamId: string }>(
  "/clubs/" + clubId + "/import/" + championshipId,
  {
    method: "POST",
    body: JSON.stringify(memberIds ? { memberIds } : {})
  }
);

export const listImportedTeams = (clubId: string) =>
  apiRequest<{ teams: ImportedTeam[] }>("/clubs/" + clubId + "/teams");

export const previewTeamSync = (clubId: string, teamId: string) =>
  apiRequest<SyncPreview>(
    "/clubs/" + clubId + "/teams/" + teamId + "/sync/preview"
  );

export const applyTeamSync = (clubId: string, teamId: string) =>
  apiRequest<SyncPreview>("/clubs/" + clubId + "/teams/" + teamId + "/sync", {
    method: "POST"
  });

export const exportRoster = async (
  clubId: string,
  format: "json" | "csv"
): Promise<{ filename: string; content: string }> => {
  const baseUrl = import.meta.env.VITE_API_URL ?? "/api";
  const response = await fetch(
    baseUrl + "/clubs/" + clubId + "/roster/export?format=" + format,
    { credentials: "include" }
  );
  if (!response.ok) {
    throw new Error("Não foi possível exportar o elenco.");
  }
  const content = await response.text();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "elenco." + format;
  return { filename, content };
};

export const importRoster = (
  clubId: string,
  format: "json" | "csv",
  content: string,
  squadId?: string
) =>
  apiRequest<{ result: RosterImportResult }>(
    "/clubs/" + clubId + "/roster/import",
    {
      method: "POST",
      body: JSON.stringify({ format, content, squadId: squadId ?? null })
    }
  );
