import type { ChampionshipService } from "../championships/championship-service.js";
import { AppError } from "../errors/app-error.js";
import type {
  ClubIdentity,
  ClubRepository
} from "./club-repository.js";

export class ClubService {
  constructor(
    private readonly repository: ClubRepository,
    private readonly championships: ChampionshipService
  ) {}

  list(ownerId: string) {
    return this.repository.listByOwner(ownerId);
  }

  async create(ownerId: string, input: ClubIdentity) {
    await this.requireUniqueName(ownerId, input.name);
    return this.repository.create(ownerId, input);
  }

  async update(ownerId: string, clubId: string, input: ClubIdentity) {
    const club = await this.requireOwned(ownerId, clubId);
    await this.requireUniqueName(ownerId, input.name, club.id);
    return this.repository.update(clubId, input);
  }

  async delete(ownerId: string, clubId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.delete(clubId)) {
      throw new AppError("Clube não encontrado.", 404, "CLUB_NOT_FOUND");
    }
  }

  async addMember(
    ownerId: string,
    clubId: string,
    input: {
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
    }
  ) {
    const club = await this.requireOwned(ownerId, clubId);
    if (this.hasName(club.members.map((member) => member.displayName), input.displayName)) {
      throw new AppError(
        "Esse jogador já está cadastrado no clube.",
        409,
        "CLUB_MEMBER_NAME_IN_USE"
      );
    }
    return this.repository.addMember(clubId, input);
  }

  async deleteMember(ownerId: string, clubId: string, memberId: string) {
    await this.requireOwned(ownerId, clubId);
    if (!await this.repository.deleteMember(clubId, memberId)) {
      throw new AppError("Jogador não encontrado.", 404, "CLUB_MEMBER_NOT_FOUND");
    }
  }

  async setCaptain(ownerId: string, clubId: string, memberId: string) {
    const club = await this.requireOwned(ownerId, clubId);
    if (!club.members.some((member) => member.id === memberId)) {
      throw new AppError("Jogador não encontrado.", 404, "CLUB_MEMBER_NOT_FOUND");
    }
    return this.repository.setCaptain(clubId, memberId);
  }

  async importIntoChampionship(
    ownerId: string,
    clubId: string,
    championshipId: string
  ) {
    const [club, championship] = await Promise.all([
      this.requireOwned(ownerId, clubId),
      this.championships.getMine(ownerId, championshipId)
    ]);
    if (championship.entryType !== "TEAM") {
      throw new AppError(
        "Esta arena aceita somente participantes individuais.",
        409,
        "INVALID_ENTRY_TYPE"
      );
    }

    const importedTeamId = await this.repository.importIntoChampionship(
      club,
      championshipId
    ).catch((error: unknown) => {
      if (isUniqueViolation(error)) {
        throw new AppError(
          "Este clube já foi importado ou existe uma equipe com o mesmo nome.",
          409,
          "CLUB_ALREADY_IMPORTED"
        );
      }
      throw error;
    });
    return { teamId: importedTeamId };
  }

  private async requireOwned(ownerId: string, clubId: string) {
    const club = await this.repository.findById(clubId);
    if (!club || club.ownerId !== ownerId) {
      throw new AppError("Clube não encontrado.", 404, "CLUB_NOT_FOUND");
    }
    return club;
  }

  private async requireUniqueName(ownerId: string, name: string, ignoredId?: string) {
    const clubs = await this.repository.listByOwner(ownerId);
    if (clubs.some((club) => club.id !== ignoredId && this.hasName([club.name], name))) {
      throw new AppError(
        "Você já possui um clube com esse nome.",
        409,
        "CLUB_NAME_IN_USE"
      );
    }
  }

  private hasName(names: string[], candidate: string) {
    const normalized = candidate.trim().toLocaleLowerCase("pt-BR");
    return names.some((name) => name.toLocaleLowerCase("pt-BR") === normalized);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "23505";
}
