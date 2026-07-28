import type {
  Championship,
  ChampionshipRepository,
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
}
