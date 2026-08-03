import { apiRequest } from "../../lib/api";

export type PlayerHistoryEvent = {
  id: string;
  type: string;
  value: number;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
};

export type PlayerMatchHistory = {
  matchId: string;
  entryId: string;
  teamName: string;
  teamLogoUrl: string | null;
  opponentEntryId: string;
  opponentDisplayName: string;
  championship: {
    id: string;
    name: string;
    slug: string;
    sport: string;
  };
  scheduledAt: Date | null;
  status: "SCHEDULED" | "FINISHED" | "CANCELED";
  homeScore: number | null;
  awayScore: number | null;
  result: "WIN" | "DRAW" | "LOSS" | null;
  events: PlayerHistoryEvent[];
};

export type PlayerHistoryResult = {
  player: {
    memberId: string;
    displayName: string;
    teamName: string;
    teamLogoUrl: string | null;
  };
  championship: {
    id: string;
    name: string;
    slug: string;
    sport: string;
  };
  items: PlayerMatchHistory[];
  total: number;
  page: number;
  limit: number;
};

export type OrganizerChampionship = {
  id: string;
  name: string;
  slug: string;
  sport: string;
  status: "PUBLISHED" | "FINISHED";
  startsAt: string | null;
  endsAt: string | null;
};

export type OrganizerProfile = {
  organizer: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  sports: string[];
  championships: {
    active: OrganizerChampionship[];
    finished: OrganizerChampionship[];
  };
};

export type PublicClubMember = {
  id: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type PublicClub = {
  id: string;
  ownerId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  members: PublicClubMember[];
};

export type ClubProfile = {
  club: PublicClub;
  sports: string[];
  championships: Array<{
    championshipId: string;
    championshipName: string;
    championshipSlug: string;
    championshipSport: string;
    championshipStatus: "PUBLISHED" | "FINISHED";
    teamId: string;
    teamName: string;
    teamLogoUrl: string | null;
  }>;
};

export const getPublicPlayerHistory = (
  memberId: string,
  params: URLSearchParams
) =>
  apiRequest<PlayerHistoryResult>(
    `/public/players/${memberId}/matches?${params.toString()}`
  );

export const getPublicOrganizer = (organizerId: string) =>
  apiRequest<OrganizerProfile>(`/public/organizers/${organizerId}`);

export const getPublicClub = (clubId: string) =>
  apiRequest<ClubProfile>(`/public/clubs/${clubId}`);
