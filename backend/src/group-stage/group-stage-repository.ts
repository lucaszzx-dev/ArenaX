import type { Match } from "../matches/match-repository.js";

export type GroupAssignment = { entryId: string; groupNumber: number };
export interface GroupStageRepository {
  list(championshipId: string): Promise<GroupAssignment[]>;
  replace(championshipId: string, assignments: GroupAssignment[]): Promise<void>;
  listGroupMatches(championshipId: string): Promise<Match[]>;
}
