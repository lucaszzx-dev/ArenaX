import { randomBytes } from "node:crypto";

import type {
  Championship,
  ChampionshipRepository,
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
      organizerId,
      slug: this.createSlug(input.name)
    });
  }

  listMine(organizerId: string): Promise<Championship[]> {
    return this.repository.listByOrganizer(organizerId);
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
    if (!championship) {
      throw new AppError(
        "Campeonato não encontrado.",
        404,
        "CHAMPIONSHIP_NOT_FOUND"
      );
    }
    return championship;
  }

  async update(
    organizerId: string,
    championshipId: string,
    input: UpdateChampionshipInput
  ): Promise<Championship> {
    await this.getMine(organizerId, championshipId);
    this.validateDates(input.startsAt, input.endsAt);

    return this.repository.update(championshipId, input);
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
