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

    return this.repository.create({
      ...input,
      allowsDraw: input.format === "KNOCKOUT" ? false : input.allowsDraw,
      thirdPlace: input.format === "KNOCKOUT" ? (input.thirdPlace ?? true) : false,
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
        "Campeonato n�o encontrado.",
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
        "Campeonato n�o encontrado.",
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

  async update(
    organizerId: string,
    championshipId: string,
    input: UpdateChampionshipInput
  ): Promise<Championship> {
    const championship = await this.getMine(organizerId, championshipId);
    this.validateDates(input.startsAt, input.endsAt);

    return this.repository.update(championshipId, {
      ...input,
      allowsDraw: championship.format === "KNOCKOUT" ? false : input.allowsDraw
    });
  }

  private validateDates(startsAt: Date | null, endsAt: Date | null) {
    if (startsAt && endsAt && endsAt < startsAt) {
      throw new AppError(
        "A data final deve ser posterior � data inicial.",
        400,
        "INVALID_CHAMPIONSHIP_DATES"
      );
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

    return `${base || "arena"}-${suffix}`;
  }
}