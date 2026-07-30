
export type MatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "FREE_THROW"
  | "TWO_POINT_SHOT"
  | "THREE_POINT_SHOT"
  | "VOLLEYBALL_POINT"
  | "ACE"
  | "BLOCK"
  | "ASSIST"
  | "SUBSTITUTION"
  | "PENALTY_CONVERTED"
  | "PENALTY_MISSED"
  | "PERSONAL_FOUL";

export type MatchEvent = {
  id: string;
  matchId: string;
  entryId: string;
  teamMemberId: string | null;
  actorName: string | null;
  type: MatchEventType;
  value: number;
  periodNumber: number | null;
  clockSeconds: number | null;
  notes: string | null;
  relatedEventId: string | null;
  createdAt: Date;
};

export type MatchEventEntry = {
  id: string;
  championshipId: string;
  teamId: string | null;
};

export type MatchEventTeamMember = {
  id: string;
  teamId: string;
  displayName: string;
};

export type CreateMatchEventInput = Omit<MatchEvent, "id" | "createdAt">;

export interface MatchEventRepository {
  list(matchId: string): Promise<MatchEvent[]>;
  listByChampionship(championshipId: string): Promise<MatchEvent[]>;
  findById(eventId: string): Promise<MatchEvent | null>;
  findEntry(entryId: string): Promise<MatchEventEntry | null>;
  findTeamMember(memberId: string): Promise<MatchEventTeamMember | null>;
  create(input: CreateMatchEventInput): Promise<MatchEvent>;
  update(eventId: string, input: CreateMatchEventInput): Promise<MatchEvent>;
  delete(eventId: string): Promise<boolean>;
}
