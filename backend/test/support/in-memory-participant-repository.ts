import type {
  IndividualParticipant,
  ParticipantRepository,
  Team,
  TeamMember
} from "../../src/participants/participant-repository.js";

export class InMemoryParticipantRepository implements ParticipantRepository {
  readonly participants: IndividualParticipant[] = [];
  readonly teams: Team[] = [];

  async listIndividuals(championshipId: string) {
    return this.participants.filter((item) => item.championshipId === championshipId);
  }

  async createIndividual(championshipId: string, displayName: string) {
    const participant = {
      id: crypto.randomUUID(),
      championshipId,
      displayName,
      userId: null,
      createdAt: new Date()
    };
    this.participants.push(participant);
    return participant;
  }

  async deleteIndividual(championshipId: string, participantId: string) {
    const index = this.participants.findIndex(
      (item) => item.id === participantId && item.championshipId === championshipId
    );
    if (index < 0) return false;
    this.participants.splice(index, 1);
    return true;
  }

  async listTeams(championshipId: string) {
    return this.teams.filter((team) => team.championshipId === championshipId);
  }

  async findTeam(teamId: string) {
    return this.teams.find((team) => team.id === teamId) ?? null;
  }

  async createTeam(championshipId: string, name: string, shortName: string | null, logoUrl: string | null) {
    const team: Team = {
      id: crypto.randomUUID(),
      championshipId,
      name,
      shortName,
      logoUrl,
      createdAt: new Date(),
      members: []
    };
    this.teams.push(team);
    return team;
  }

  async updateTeamIdentity(
    teamId: string,
    input: { name: string; shortName: string | null; logoUrl: string | null }
  ) {
    const team = this.teams.find((item) => item.id === teamId);
    if (!team) throw new Error("Equipe não encontrada.");
    Object.assign(team, input);
    return team;
  }

  async setCaptain(teamId: string, memberId: string) {
    const team = this.teams.find((item) => item.id === teamId);
    if (!team) throw new Error("Equipe não encontrada.");
    for (const member of team.members) member.isCaptain = member.id === memberId;
    return team;
  }

  async deleteTeam(championshipId: string, teamId: string) {
    const index = this.teams.findIndex(
      (team) => team.id === teamId && team.championshipId === championshipId
    );
    if (index < 0) return false;
    this.teams.splice(index, 1);
    return true;
  }

  async addTeamMember(teamId: string, displayName: string): Promise<TeamMember> {
    const member = {
      id: crypto.randomUUID(),
      teamId,
      displayName,
      jerseyNumber: null,
      position: null,
      isCaptain: false,
      userId: null,
      createdAt: new Date()
    };
    this.teams.find((team) => team.id === teamId)?.members.push(member);
    return member;
  }

  async deleteTeamMember(teamId: string, memberId: string) {
    const team = this.teams.find((item) => item.id === teamId);
    const index = team?.members.findIndex((member) => member.id === memberId) ?? -1;
    if (!team || index < 0) return false;
    team.members.splice(index, 1);
    return true;
  }
}
