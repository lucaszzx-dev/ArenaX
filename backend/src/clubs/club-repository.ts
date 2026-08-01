export type ClubMember = {
  id: string;
  clubId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
  createdAt: Date;
};

export type ClubSeason = {
  id: string;
  clubId: string;
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  members: ClubSquadMember[];
};

export type ClubStaff = {
  id: string;
  clubId: string;
  displayName: string;
  role: string;
  createdAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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

export type ClubMemberInput = {
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
};

export type ClubSeasonInput = {
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type ClubSquadInput = {
  name: string;
  category: string | null;
  sport: string | null;
  seasonId: string | null;
  isPrimary: boolean;
};

export type ClubStaffInput = {
  displayName: string;
  role: string;
};

export type SquadMemberRef = {
  clubMemberId: string;
  role: string;
};

export type TeamMemberChange = {
  teamMemberId: string;
  clubMemberId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type TeamSyncDiff = {
  toAdd: ImportMemberRow[];
  toUpdate: TeamMemberChange[];
  toRemove: Array<{ teamMemberId: string; displayName: string }>;
  protectedMembers: Array<{ teamMemberId: string; displayName: string }>;
  unchanged: number;
};

export type ImportMemberRow = {
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type RosterImportResult = {
  created: number;
  updated: number;
  skipped: number;
};

export interface ClubRepository {
  listByOwner(ownerId: string): Promise<Club[]>;
  findById(clubId: string): Promise<Club | null>;
  create(ownerId: string, input: ClubIdentity): Promise<Club>;
  update(clubId: string, input: ClubIdentity): Promise<Club>;
  delete(clubId: string): Promise<boolean>;
  addMember(clubId: string, input: ClubMemberInput): Promise<ClubMember>;
  updateMember(clubId: string, memberId: string, input: ClubMemberInput): Promise<ClubMember>;
  deleteMember(clubId: string, memberId: string): Promise<boolean>;
  setCaptain(clubId: string, memberId: string): Promise<Club>;
  addSeason(clubId: string, input: ClubSeasonInput): Promise<ClubSeason>;
  updateSeason(clubId: string, seasonId: string, input: ClubSeasonInput): Promise<ClubSeason>;
  deleteSeason(clubId: string, seasonId: string): Promise<boolean>;
  addSquad(clubId: string, input: ClubSquadInput): Promise<ClubSquad>;
  updateSquad(clubId: string, squadId: string, input: ClubSquadInput): Promise<ClubSquad>;
  deleteSquad(clubId: string, squadId: string): Promise<boolean>;
  setSquadMembers(clubId: string, squadId: string, members: SquadMemberRef[]): Promise<ClubSquad>;
  addStaff(clubId: string, input: ClubStaffInput): Promise<ClubStaff>;
  deleteStaff(clubId: string, staffId: string): Promise<boolean>;
  importIntoChampionship(
    club: Club,
    championshipId: string,
    memberIds?: string[]
  ): Promise<string>;
  listImportedTeams(clubId: string): Promise<Array<{
    id: string;
    championshipId: string;
    name: string;
    shortName: string | null;
    logoUrl: string | null;
  }>>;
  findTeamWithMembers(teamId: string): Promise<{
    id: string;
    championshipId: string;
    sourceClubId: string | null;
    name: string;
    members: Array<{
      id: string;
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
      isCaptain: boolean;
    }>;
  } | null>;
  findProtectedTeamMemberIds(teamId: string): Promise<string[]>;
  applyTeamSync(teamId: string, diff: TeamSyncDiff): Promise<void>;
  importRoster(
    clubId: string,
    rows: ImportMemberRow[],
    squadId?: string
  ): Promise<RosterImportResult>;
  recordAudit(
    actorId: string,
    clubId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void>;
  listAuditLogs(clubId: string): Promise<Array<{
    id: string;
    actorId: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: Date;
  }>>;
}




