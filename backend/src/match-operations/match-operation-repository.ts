export type LineupRole = "STARTER" | "SUBSTITUTE";

export type MatchLineup = {
  id: string;
  matchId: string;
  entryId: string;
  teamMemberId: string;
  role: LineupRole;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  createdAt: Date;
};

export type MatchMetadata = {
  venue: string | null;
  referee: string | null;
  operationalNotes: string | null;
};

export interface MatchOperationRepository {
  getMetadata(matchId: string): Promise<MatchMetadata | null>;
  updateMetadata(matchId: string, input: MatchMetadata): Promise<MatchMetadata>;
  listLineup(matchId: string): Promise<MatchLineup[]>;
  replaceLineup(
    matchId: string,
    entryId: string,
    players: Array<{ teamMemberId: string; role: LineupRole }>
  ): Promise<MatchLineup[]>;
  findEntryTeam(entryId: string): Promise<string | null>;
  listValidMemberIds(teamId: string): Promise<string[]>;
}

export type MatchMvp = {
  mvpId: string | null;
  mvpName: string | null;
};
