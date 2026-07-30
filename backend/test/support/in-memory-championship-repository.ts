import type {
  Championship,
  ChampionshipRepository,
  PublicChampionshipFilters,
  PublicChampionshipPage,
  SaveChampionshipInput,
  UpdateChampionshipInput
} from "../../src/championships/championship-repository.js";

export class InMemoryChampionshipRepository
  implements ChampionshipRepository
{
  readonly championships: Championship[] = [];

  async create(input: SaveChampionshipInput): Promise<Championship> {
    const now = new Date();
    const championship: Championship = {
      ...input,
      format: input.format ?? "LEAGUE",
      thirdPlace: input.thirdPlace ?? true,
      id: crypto.randomUUID(),
      status: "DRAFT",
      createdAt: now,
      updatedAt: now
    };
    this.championships.push(championship);
    return championship;
  }

  async listByOrganizer(organizerId: string): Promise<Championship[]> {
    return this.championships.filter(
      (championship) => championship.organizerId === organizerId
    );
  }

  async listPublic(
    filters: PublicChampionshipFilters
  ): Promise<PublicChampionshipPage> {
    const filtered = this.championships.filter((championship) =>
      championship.status !== "DRAFT" &&
      (!filters.status || championship.status === filters.status) &&
      (!filters.sport || championship.sport === filters.sport) &&
      (!filters.entryType || championship.entryType === filters.entryType) &&
      (!filters.search ||
        championship.name.toLocaleLowerCase("pt-BR").includes(
          filters.search.toLocaleLowerCase("pt-BR")
        ))
    );
    const start = (filters.page - 1) * filters.limit;

    return {
      items: filtered.slice(start, start + filters.limit),
      total: filtered.length,
      page: filters.page,
      limit: filters.limit
    };
  }

  async findById(id: string): Promise<Championship | null> {
    return this.championships.find((item) => item.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Championship | null> {
    return this.championships.find((item) => item.slug === slug) ?? null;
  }

  async update(
    id: string,
    input: UpdateChampionshipInput
  ): Promise<Championship> {
    const championship = this.championships.find((item) => item.id === id);

    if (!championship) {
      throw new Error("Campeonato não encontrado.");
    }

    Object.assign(championship, input, { updatedAt: new Date() });
    return championship;
  }

  async updateStatus(
    id: string,
    status: Championship["status"]
  ): Promise<Championship> {
    const championship = this.championships.find((item) => item.id === id);
    if (!championship) throw new Error("Campeonato não encontrado.");
    championship.status = status;
    championship.updatedAt = new Date();
    return championship;
  }
}
