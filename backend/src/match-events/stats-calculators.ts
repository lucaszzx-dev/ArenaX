import type { Match } from "../matches/match-repository.js";
import type { MatchEventType } from "./match-event-repository.js";

export type PointsEventType =
  | "FREE_THROW"
  | "TWO_POINT_SHOT"
  | "THREE_POINT_SHOT"
  | "VOLLEYBALL_POINT"
  | "ACE"
  | "BLOCK"
  | "SPIKE";

export const pointsEventTypes: readonly MatchEventType[] = [
  "FREE_THROW",
  "TWO_POINT_SHOT",
  "THREE_POINT_SHOT",
  "VOLLEYBALL_POINT",
  "ACE",
  "BLOCK",
  "SPIKE"
];

export function isCountedMatch(
  match: Match
): match is Match & { homeScore: number; awayScore: number } {
  return (
    match.status === "FINISHED" &&
    match.homeScore !== null &&
    match.awayScore !== null
  );
}

export function playerPrimaryMetric(
  statistic: { goals: number; points: number },
  sport: string
): number {
  if (sport === "Futebol" || sport === "Futsal") return statistic.goals;
  return statistic.points;
}

export type MatchResult = {
  entryId: string;
  opponentEntryId: string;
  goalsFor: number;
  goalsAgainst: number;
  played: boolean;
  won: boolean;
  lost: boolean;
  drew: boolean;
};

export function matchResult(
  match: Match,
  entryId: string
): MatchResult | null {
  if (!isCountedMatch(match)) return null;
  if (match.homeEntryId === entryId) {
    return buildResult(
      entryId,
      match.awayEntryId,
      match.homeScore,
      match.awayScore
    );
  }
  if (match.awayEntryId === entryId) {
    return buildResult(
      entryId,
      match.homeEntryId,
      match.awayScore,
      match.homeScore
    );
  }
  return null;
}

function buildResult(
  entryId: string,
  opponentEntryId: string,
  goalsFor: number,
  goalsAgainst: number
): MatchResult {
  return {
    entryId,
    opponentEntryId,
    goalsFor,
    goalsAgainst,
    played: true,
    won: goalsFor > goalsAgainst,
    lost: goalsFor < goalsAgainst,
    drew: goalsFor === goalsAgainst
  };
}

export function formatPercentage(
  played: number,
  score: number
): number | null {
  if (played <= 0) return null;
  return Math.round((score / played) * 10_000) / 100;
}

export function rankSort<T>(rows: T[], score: (row: T) => number): T[] {
  return [...rows].sort((a, b) => score(b) - score(a));
}
