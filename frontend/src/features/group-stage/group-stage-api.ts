import { apiRequest } from "../../lib/api";
import type { ArenaMatch, MatchEntry, Standing } from "../matches/match-api";
import type { KnockoutNode } from "../knockout/knockout-api";

export type GroupStageOverview = { groups: Array<{ number: number; name: string; entryIds: string[]; entries: MatchEntry[]; standings: Standing[] }>; matches: ArenaMatch[] };
export const getGroups = (id: string) => apiRequest<GroupStageOverview>(`/championships/${id}/groups`);
export const getPublicGroups = (slug: string) => apiRequest<GroupStageOverview>(`/public/championships/${slug}/groups`);
export const generateGroups = (id: string) => apiRequest<GroupStageOverview>(`/championships/${id}/groups/generate`, { method: "POST" });
export const generateGroupBracket = (id: string) => apiRequest<{nodes: KnockoutNode[]; totalRounds:number; bracketSize:number; byes:number}>(`/championships/${id}/groups/bracket`, { method: "POST" });
