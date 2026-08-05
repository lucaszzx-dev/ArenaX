import { randomBytes } from "node:crypto";

import type {
  Championship,
  ChampionshipRepository,
  PublicChampionshipFilters,
  SaveChampionshipInput,
  UpdateChampionshipInput
} from "./championship-repository.js";
import { AppError } from "../errors/app-error.js";

export type ChampionshipInput = Omit<
  SaveChampionshipInput,
  "organizerId" | "slug"
>;

export class ChampionshipService {
  constructor(private readonly repository: ChampionshipRepository) {}

  async create(
    organizerId: string,
    input: ChampionshipInput
  ): Promise<Championship> {
    this.validateDates(input.startsAt, input.endsAt);
    this.validateGroupFormat(input);

    const sportRules = this.normalizeSportRules(input.sport, {
      bestOfSets: input.bestOfSets,
      maxYellowCards: input.maxYellowCards
    });

    return this.repository.create({
      ...input,
      ...sportRules,
      allowsDraw: input.format === "KNOCKOUT" ? false : input.allowsDraw,
      thirdPlace: input.format === "KNOCKOUT" || input.format === "GROUP_KNOCKOUT" ? (input.thirdPlace ?? true) : false,
      format: input.format ?? "LEAGUE",
      organizerId,
      slug: this.createSlug(input.name)
    });
  }

  listMine(organizerId: string): Promise<Championship[]> {
    return this.repository.listByOrganizer(organizerId);
  }

  listPublic(filters: PublicChampionshipFilters) {
    return this.repository.listPublic(filters);
  }

  async getMine(
    organizerId: string,
    championshipId: string
  ): Promise<Championship> {
    const championship = await this.repository.findById(championshipId);

    if (!championship || championship.organizerId !== organizerId) {
      throw new AppError(
        "Campeonato não encontrado.",
        404,
        "CHAMPIONSHIP_NOT_FOUND"
      );
    }

    return championship;
  }

  async getPublic(slug: string): Promise<Championship> {
    const championship = await this.repository.findBySlug(slug);
    if (!championship || championship.status === "DRAFT") {
      throw new AppError(
        "Campeonato não encontrado.",
        404,
        "CHAMPIONSHIP_NOT_FOUND"
      );
    }
    return championship;
  }

  async findById(id: string): Promise<Championship | null> {
    return this.repository.findById(id);
  }

  async getChampionshipById(id: string): Promise<Championship | null> {
    return this.repository.findById(id);
  }

  async setStatus(
    organizerId: string,
    championshipId: string,
    status: Championship["status"]
  ) {
    await this.getMine(organizerId, championshipId);
    return this.repository.updateStatus(championshipId, status);
  }

  async delete(organizerId: string, championshipId: string) {
    await this.getMine(organizerId, championshipId);
    if (!(await this.repository.delete(championshipId))) {
      throw new AppError(
        "Campeonato não encontrado.",
        404,
        "CHAMPIONSHIP_NOT_FOUND"
      );
    }
  }

  async update(
    organizerId: string,
    championshipId: string,
    input: UpdateChampionshipInput
  ): Promise<Championship> {
    const championship = await this.getMine(organizerId, championshipId);
    this.validateDates(input.startsAt, input.endsAt);

    const sportRules = this.normalizeSportRules(input.sport, {
      bestOfSets: input.bestOfSets,
      maxYellowCards: input.maxYellowCards
    });

    return this.repository.update(championshipId, {
      ...input,
      ...sportRules,
      allowsDraw: championship.format === "KNOCKOUT" ? false : input.allowsDraw
    });
  }

  private normalizeSportRules(
    sport: string,
    rules: { bestOfSets?: number | undefined; maxYellowCards?: number | undefined }
  ) {
    const isVolleyball = sport === "Vôlei";
    const isFootballLike = sport === "Futebol" || sport === "Futsal";

    return {
      bestOfSets: isVolleyball ? (rules.bestOfSets ?? 5) : 5,
      maxYellowCards: isFootballLike ? (rules.maxYellowCards ?? 0) : 0
    };
  }

  private validateDates(startsAt: Date | null, endsAt: Date | null) {
    if (startsAt && endsAt && endsAt < startsAt) {
      throw new AppError(
        "A data final deve ser posterior à data inicial.",
        400,
        "INVALID_CHAMPIONSHIP_DATES"
      );
    }
  }

  private validateGroupFormat(input: ChampionshipInput) {
    if (input.format !== "GROUP_KNOCKOUT") return;
    const groups = input.groupCount;
    const legs = input.groupLegs;
    const qualifiers = input.qualifiersPerGroup;
    if (!Number.isInteger(groups) || groups == null || groups < 2 || !Number.isInteger(legs) || ![1, 2].includes(legs!) || !Number.isInteger(qualifiers) || qualifiers == null || qualifiers < 1) {
      throw new AppError("Informe grupos, turno e classificados válidos.", 400, "INVALID_GROUP_STAGE_CONFIG");
    }
    const total = groups * qualifiers;
    if (total < 2 || (total & (total - 1)) !== 0) {
      throw new AppError("O total de classificados deve ser uma potência de dois.", 400, "INVALID_QUALIFIER_BRACKET_SIZE");
    }
  }

  private createSlug(name: string) {
    const base = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const suffix = randomBytes(3).toString("hex");

    return `${base || "competicao"}-${suffix}`;
  }
}
