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

export interface ChampionshipRepository {
  create(input: SaveChampionshipInput): Promise<Championship>;
  listByOrganizer(organizerId: string): Promise<Championship[]>;
  findById(id: string): Promise<Championship | null>;
  update(
    id: string,
    input: UpdateChampionshipInput
  ): Promise<Championship>;
}
