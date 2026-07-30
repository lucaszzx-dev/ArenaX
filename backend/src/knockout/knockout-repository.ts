export type KnockoutNode = {
  id: string;
  championshipId: string;
  roundNumber: number;
  position: number;
  homeEntryId: string | null;
  awayEntryId: string | null;
  matchId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveKnockoutNode = Omit<
  KnockoutNode,
  "id" | "championshipId" | "matchId" | "createdAt" | "updatedAt"
>;

export interface KnockoutRepository {
  list(championshipId: string): Promise<KnockoutNode[]>;
  createBracket(
    championshipId: string,
    nodes: SaveKnockoutNode[]
  ): Promise<KnockoutNode[]>;
  advanceWinner(matchId: string, winnerEntryId: string): Promise<void>;
  advanceLoser(matchId: string, loserEntryId: string): Promise<void>;
  prepareReopen(matchId: string): Promise<void>;
}
