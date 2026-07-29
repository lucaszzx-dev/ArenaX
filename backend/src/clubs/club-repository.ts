export type ClubMember = {
  id: string;
  clubId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
  createdAt: Date;
};

export type Club = {
  id: string;
  ownerId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ClubMember[];
};

export type ClubIdentity = {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
};

export interface ClubRepository {
  listByOwner(ownerId: string): Promise<Club[]>;
  findById(clubId: string): Promise<Club | null>;
  create(ownerId: string, input: ClubIdentity): Promise<Club>;
  update(clubId: string, input: ClubIdentity): Promise<Club>;
  delete(clubId: string): Promise<boolean>;
  addMember(
    clubId: string,
    input: {
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
    }
  ): Promise<ClubMember>;
  deleteMember(clubId: string, memberId: string): Promise<boolean>;
  setCaptain(clubId: string, memberId: string): Promise<Club>;
  importIntoChampionship(club: Club, championshipId: string): Promise<string>;
}
