export type IndividualParticipant = {
  id: string;
  championshipId: string;
  displayName: string;
  userId: string | null;
  createdAt: Date;
};

export type TeamMember = {
  id: string;
  teamId: string;
  displayName: string;
  jerseyNumber: number | null;
  position: string | null;
  userId: string | null;
  createdAt: Date;
};

export type Team = {
  id: string;
  championshipId: string;
  name: string;
  shortName: string | null;
  createdAt: Date;
  members: TeamMember[];
};

export interface ParticipantRepository {
  listIndividuals(championshipId: string): Promise<IndividualParticipant[]>;
  createIndividual(
    championshipId: string,
    displayName: string
  ): Promise<IndividualParticipant>;
  deleteIndividual(championshipId: string, participantId: string): Promise<boolean>;
  listTeams(championshipId: string): Promise<Team[]>;
  findTeam(teamId: string): Promise<Team | null>;
  createTeam(
    championshipId: string,
    name: string,
    shortName: string | null
  ): Promise<Team>;
  deleteTeam(championshipId: string, teamId: string): Promise<boolean>;
  addTeamMember(teamId: string, displayName: string): Promise<TeamMember>;
  deleteTeamMember(teamId: string, memberId: string): Promise<boolean>;
}
