export type ChampionshipEntryType = "INDIVIDUAL" | "TEAM";
export type ChampionshipStatus = "DRAFT" | "PUBLISHED" | "FINISHED";

export type Championship = {
  id: string;
  organizerId: string;
  name: string;
  slug: string;
  sport: string;
  description: string | null;
  entryType: ChampionshipEntryType;
  status: ChampionshipStatus;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  allowsDraw: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveChampionshipInput = Omit<
  Championship,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export type UpdateChampionshipInput = Omit<
  SaveChampionshipInput,
  "organizerId" | "slug"
>;

export type PublicChampionshipFilters = {
  search?: string | undefined;
  sport?: string | undefined;
  entryType?: ChampionshipEntryType | undefined;
  status?: Exclude<ChampionshipStatus, "DRAFT"> | undefined;
  page: number;
  limit: number;
};

export type PublicChampionshipPage = {
  items: Championship[];
  total: number;
  page: number;
  limit: number;
};

export interface ChampionshipRepository {
  create(input: SaveChampionshipInput): Promise<Championship>;
  listByOrganizer(organizerId: string): Promise<Championship[]>;
  listPublic(filters: PublicChampionshipFilters): Promise<PublicChampionshipPage>;
  findById(id: string): Promise<Championship | null>;
  findBySlug(slug: string): Promise<Championship | null>;
  update(
    id: string,
    input: UpdateChampionshipInput
  ): Promise<Championship>;
  updateStatus(id: string, status: ChampionshipStatus): Promise<Championship>;
}
