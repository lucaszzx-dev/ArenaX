import { desc, eq } from "drizzle-orm";

import type {
  Championship,
  ChampionshipRepository,
  SaveChampionshipInput,
  UpdateChampionshipInput
} from "./championship-repository.js";
import type { Database } from "../db/client.js";
import { championships } from "../db/schema.js";

export class DrizzleChampionshipRepository
  implements ChampionshipRepository
{
  constructor(private readonly db: Database) {}

  async create(input: SaveChampionshipInput): Promise<Championship> {
    const [championship] = await this.db
      .insert(championships)
      .values(input)
      .returning();

    if (!championship) {
      throw new Error("Não foi possível criar o campeonato.");
    }

    return championship;
  }

  listByOrganizer(organizerId: string): Promise<Championship[]> {
    return this.db
      .select()
      .from(championships)
      .where(eq(championships.organizerId, organizerId))
      .orderBy(desc(championships.createdAt));
  }

  async findById(id: string): Promise<Championship | null> {
    const [championship] = await this.db
      .select()
      .from(championships)
      .where(eq(championships.id, id))
      .limit(1);

    return championship ?? null;
  }

  async findBySlug(slug: string): Promise<Championship | null> {
    const [championship] = await this.db
      .select()
      .from(championships)
      .where(eq(championships.slug, slug))
      .limit(1);
    return championship ?? null;
  }

  async update(
    id: string,
    input: UpdateChampionshipInput
  ): Promise<Championship> {
    const [championship] = await this.db
      .update(championships)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(championships.id, id))
      .returning();

    if (!championship) {
      throw new Error("Não foi possível atualizar o campeonato.");
    }

    return championship;
  }
}
