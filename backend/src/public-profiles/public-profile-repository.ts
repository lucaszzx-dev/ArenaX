export type PublicMemberContext = {
  memberId: string;
  displayName: string;
  teamId: string;
  teamName: string;
  teamShortName: string | null;
  teamLogoUrl: string | null;
  championshipId: string;
  championshipName: string;
  championshipSlug: string;
  championshipSport: string;
  championshipStatus: "DRAFT" | "PUBLISHED" | "FINISHED";
  entryId: string;
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
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

export type PublicClubParticipation = {
  championshipId: string;
  championshipName: string;
  championshipSlug: string;
  championshipSport: string;
  championshipStatus: "DRAFT" | "PUBLISHED" | "FINISHED";
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
};

export interface PublicProfileRepository {
  findMemberContext(memberId: string): Promise<PublicMemberContext | null>;
  findProfile(userId: string): Promise<PublicProfile | null>;
  findClub(clubId: string): Promise<PublicClub | null>;
  listClubsByOwner(
    ownerId: string
  ): Promise<Array<{ id: string; name: string; shortName: string | null; logoUrl: string | null }>>;
  listClubParticipations(clubId: string): Promise<PublicClubParticipation[]>;
}
