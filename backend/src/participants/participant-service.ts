import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type {
  IndividualParticipant,
  ParticipantRepository,
  Team,
  TeamMember
} from "./participant-repository.js";

export class ParticipantService {
  constructor(
    private readonly repository: ParticipantRepository,
    private readonly championships: ChampionshipService
  ) {}

  async list(organizerId: string, championshipId: string) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );

    if (championship.entryType === "INDIVIDUAL") {
      return {
        entryType: championship.entryType,
        participants: await this.repository.listIndividuals(championshipId),
        teams: []
      };
    }

    return {
      entryType: championship.entryType,
      participants: [],
      teams: await this.repository.listTeams(championshipId)
    };
  }

  async createIndividual(
    organizerId: string,
    championshipId: string,
    displayName: string
  ): Promise<IndividualParticipant> {
    await this.requireEntryType(organizerId, championshipId, "INDIVIDUAL");
    const existing = await this.repository.listIndividuals(championshipId);

    if (this.hasName(existing.map((item) => item.displayName), displayName)) {
      throw new AppError(
        "Já existe um participante com esse nome.",
        409,
        "PARTICIPANT_NAME_IN_USE"
      );
    }

    return this.repository.createIndividual(championshipId, displayName);
  }

  async deleteIndividual(
    organizerId: string,
    championshipId: string,
    participantId: string
  ) {
    await this.requireEntryType(organizerId, championshipId, "INDIVIDUAL");

    if (!await this.repository.deleteIndividual(championshipId, participantId)) {
      throw new AppError("Participante não encontrado.", 404, "PARTICIPANT_NOT_FOUND");
    }
  }

  async createTeam(
    organizerId: string,
    championshipId: string,
    name: string,
    shortName: string | null,
    logoUrl: string | null = null
  ): Promise<Team> {
    await this.requireEntryType(organizerId, championshipId, "TEAM");
    const existing = await this.repository.listTeams(championshipId);

    if (this.hasName(existing.map((team) => team.name), name)) {
      throw new AppError(
        "Já existe uma equipe com esse nome.",
        409,
        "TEAM_NAME_IN_USE"
      );
    }

    return this.repository.createTeam(championshipId, name, shortName, logoUrl);
  }

  async updateTeam(
    organizerId: string,
    championshipId: string,
    teamId: string,
    input: { name: string; shortName: string | null; logoUrl: string | null }
  ) {
    await this.requireEntryType(organizerId, championshipId, "TEAM");
    await this.requireTeam(championshipId, teamId);
    return this.repository.updateTeamIdentity(teamId, input);
  }

  async setCaptain(
    organizerId: string,
    championshipId: string,
    teamId: string,
    memberId: string
  ) {
    await this.requireEntryType(organizerId, championshipId, "TEAM");
    const team = await this.requireTeam(championshipId, teamId);
    if (!team.members.some((member) => member.id === memberId)) {
      throw new AppError("Jogador não encontrado.", 404, "TEAM_MEMBER_NOT_FOUND");
    }
    return this.repository.setCaptain(teamId, memberId);
  }

  async getPublicTeam(championshipId: string, teamId: string) {
    return this.requireTeam(championshipId, teamId);
  }

  async deleteTeam(organizerId: string, championshipId: string, teamId: string) {
    await this.requireEntryType(organizerId, championshipId, "TEAM");

    if (!await this.repository.deleteTeam(championshipId, teamId)) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }
  }

  async addTeamMember(
    organizerId: string,
    championshipId: string,
    teamId: string,
    displayName: string,
    jerseyNumber: number | null = null,
    position: string | null = null
  ): Promise<TeamMember> {
    await this.requireEntryType(organizerId, championshipId, "TEAM");
    const team = await this.requireTeam(championshipId, teamId);

    if (this.hasName(team.members.map((member) => member.displayName), displayName)) {
      throw new AppError(
        "Esse jogador já está cadastrado na equipe.",
        409,
        "TEAM_MEMBER_NAME_IN_USE"
      );
    }

    return this.repository.addTeamMember(
      teamId,
      displayName,
      jerseyNumber,
      position
    );
  }

  async deleteTeamMember(
    organizerId: string,
    championshipId: string,
    teamId: string,
    memberId: string
  ) {
    await this.requireEntryType(organizerId, championshipId, "TEAM");
    await this.requireTeam(championshipId, teamId);

    if (!await this.repository.deleteTeamMember(teamId, memberId)) {
      throw new AppError("Jogador não encontrado.", 404, "TEAM_MEMBER_NOT_FOUND");
    }
  }

  private async requireEntryType(
    organizerId: string,
    championshipId: string,
    expected: "INDIVIDUAL" | "TEAM"
  ) {
    const championship = await this.championships.getMine(
      organizerId,
      championshipId
    );

    if (championship.entryType !== expected) {
      throw new AppError(
        expected === "TEAM"
          ? "Esta arena aceita somente participantes individuais."
          : "Esta arena aceita somente equipes.",
        409,
        "INVALID_ENTRY_TYPE"
      );
    }
  }

  private async requireTeam(championshipId: string, teamId: string) {
    const team = await this.repository.findTeam(teamId);

    if (!team || team.championshipId !== championshipId) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }

    return team;
  }

  private hasName(names: string[], candidate: string) {
    const normalized = candidate.trim().toLocaleLowerCase("pt-BR");
    return names.some((name) => name.toLocaleLowerCase("pt-BR") === normalized);
  }
}
