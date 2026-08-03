import type { Championship } from "../championships/championship-repository.js";
import type { Match, MatchEntry } from "../matches/match-repository.js";
import type { MatchEvent } from "./match-event-repository.js";
import {
  formatAproveitamento,
  formatPercentage,
  isCountedMatch,
  matchResult,
  playerPrimaryMetric,
  pointsEventTypes,
  rankSort
} from "./stats-calculators.js";

export type PlayerStatistic = {
  teamMemberId: string | null;
  entryId: string;
  actorName: string;
  goals: number;
  points: number;
  aces: number;
  blocks: number;
  yellowCards: number;
  redCards: number;
  personalFouls: number;
  events: number;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type ClubStandingRow = {
  entryId: string;
  displayName: string;
  teamId: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  percentage: number | null;
  currentStreak: number;
  currentStreakType: "W" | "D" | "L" | null;
  maxWinStreak: number;
  maxDrawStreak: number;
  maxLossStreak: number;
};

export type HeadToHeadRow = {
  entryId: string;
  displayName: string;
  teamId: string | null;
  opponentEntryId: string;
  opponentDisplayName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  percentage: number | null;
};

export type Highlight =
  | { category: "top_scorer"; sport: string; label: string; rank: number; player: PlayerStatistic }
  | { category: "leader_aces"; sport: string; label: string; rank: number; player: PlayerStatistic }
  | { category: "leader_points"; sport: string; label: string; rank: number; player: PlayerStatistic }
  | { category: "leader_blocks"; sport: string; label: string; rank: number; player: PlayerStatistic };

export type StatsFilters = {
  sport?: string | undefined;
  teamId?: string | undefined;
  playerId?: string | undefined;
};

type TeamIdentity = { teamId: string | null; displayName: string };





export function computePlayerStatistics(
  events: MatchEvent[],
  sport: string
): PlayerStatistic[] {
  const statistics = new Map<string, PlayerStatistic>();

  for (const event of events) {
    if (!event.actorName) continue;
    const key = event.teamMemberId ?? `${event.entryId}:${event.actorName}`;
    const statistic = statistics.get(key) ?? {
      teamMemberId: event.teamMemberId,
      entryId: event.entryId,
      actorName: event.actorName,
      goals: 0,
      points: 0,
      aces: 0,
      blocks: 0,
      yellowCards: 0,
      redCards: 0,
      personalFouls: 0,
      events: 0
    };
    statistic.events += 1;
    if (event.type === "GOAL") statistic.goals += 1;
    if (pointsEventTypes.includes(event.type)) statistic.points += event.value;
    if (event.type === "ACE") statistic.aces += 1;
    if (event.type === "BLOCK") statistic.blocks += 1;
    if (event.type === "YELLOW_CARD") statistic.yellowCards += 1;
    if (event.type === "RED_CARD") statistic.redCards += 1;
    if (event.type === "PERSONAL_FOUL") statistic.personalFouls += 1;
    statistics.set(key, statistic);
  }

  return [...statistics.values()].sort(
    (a, b) =>
      playerPrimaryMetric(b, sport) - playerPrimaryMetric(a, sport) ||
      b.events - a.events ||
      a.actorName.localeCompare(b.actorName, "pt-BR")
  );
}

export function computePlayerStatisticsForMember(
  events: MatchEvent[],
  memberId: string
): PlayerStatistic | null {
  const playerEvents = events.filter(
    (event) => event.teamMemberId === memberId && event.actorName
  );
  if (!playerEvents.length) return null;
  const statistic: PlayerStatistic = {
    teamMemberId: memberId,
    entryId: playerEvents[0]!.entryId,
    actorName: playerEvents[0]!.actorName ?? "",
    goals: 0,
    points: 0,
    aces: 0,
    blocks: 0,
    yellowCards: 0,
    redCards: 0,
    personalFouls: 0,
    events: 0
  };
  for (const event of playerEvents) {
    statistic.events += 1;
    if (event.type === "GOAL") statistic.goals += 1;
    if (pointsEventTypes.includes(event.type)) statistic.points += event.value;
    if (event.type === "ACE") statistic.aces += 1;
    if (event.type === "BLOCK") statistic.blocks += 1;
    if (event.type === "YELLOW_CARD") statistic.yellowCards += 1;
    if (event.type === "RED_CARD") statistic.redCards += 1;
    if (event.type === "PERSONAL_FOUL") statistic.personalFouls += 1;
  }
  return statistic;
}

function teamIdentity(entries: MatchEntry[], entryId: string): TeamIdentity {
  const entry = entries.find((item) => item.id === entryId);
  return {
    teamId: entry?.teamId ?? null,
    displayName: entry?.displayName ?? "Participante"
  };
}

function resultType(result: {
  won: boolean;
  drew: boolean;
}): "W" | "D" | "L" {
  return result.won ? "W" : result.drew ? "D" : "L";
}

export function computeClubStandings(
  matches: Match[],
  entries: MatchEntry[],
  championship: Championship
): ClubStandingRow[] {
  const results = new Map<string, Array<ReturnType<typeof matchResult>>>();
  for (const match of matches) {
    const home = matchResult(match, match.homeEntryId);
    const away = matchResult(match, match.awayEntryId);
    if (home) {
      const list = results.get(match.homeEntryId) ?? [];
      list.push(home);
      results.set(match.homeEntryId, list);
    }
    if (away) {
      const list = results.get(match.awayEntryId) ?? [];
      list.push(away);
      results.set(match.awayEntryId, list);
    }
  }

  const byEntry = new Map<string, ClubStandingRow>();
  for (const entry of entries) {
    const identity = teamIdentity(entries, entry.id);
    byEntry.set(entry.id, {
      entryId: entry.id,
      displayName: identity.displayName,
      teamId: identity.teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      percentage: null,
      currentStreak: 0,
      currentStreakType: null,
      maxWinStreak: 0,
      maxDrawStreak: 0,
      maxLossStreak: 0
    });
  }

  for (const [entryId, list] of results) {
    const row = byEntry.get(entryId);
    if (!row) continue;
    for (const result of list) {
      row.played += 1;
      row.goalsFor += result!.goalsFor;
      row.goalsAgainst += result!.goalsAgainst;
      if (result!.won) {
        row.wins += 1;
        row.points += championship.winPoints;
      } else if (result!.lost) {
        row.losses += 1;
        row.points += championship.lossPoints;
      } else {
        row.draws += 1;
        row.points += championship.drawPoints;
      }
    }
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.percentage = formatAproveitamento(
      row.played,
      row.points,
      championship.winPoints
    );
  }

  for (const [entryId, row] of byEntry) {
    const list = results.get(entryId) ?? [];
    let run = 0;
    let runType: "W" | "D" | "L" | null = null;
    for (const result of list) {
      const type = resultType(result!);
      if (type === runType) run += 1;
      else {
        run = 1;
        runType = type;
      }
      if (runType === "W" && run > row.maxWinStreak) row.maxWinStreak = run;
      if (runType === "D" && run > row.maxDrawStreak) row.maxDrawStreak = run;
      if (runType === "L" && run > row.maxLossStreak) row.maxLossStreak = run;
    }
    if (list.length) {
      row.currentStreakType = resultType(list[list.length - 1]!);
      let index = list.length - 1;
      let streak = 1;
      while (index > 0) {
        const previous = list[index - 1]!;
        if (resultType(previous) !== row.currentStreakType) break;
        streak += 1;
        index -= 1;
      }
      row.currentStreak = streak;
    }
  }

  return [...byEntry.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.displayName.localeCompare(b.displayName, "pt-BR")
  );
}
export function computeHeadToHead(
  matches: Match[],
  entries: MatchEntry[],
  entryAId: string,
  entryBId: string
): HeadToHeadRow[] {
  const rows: HeadToHeadRow[] = [];
  const byEntry = new Map<string, HeadToHeadRow>();
  for (const match of matches) {
    if (!isCountedMatch(match)) continue;
    const pairs: Array<{ id: string; opponentId: string; forScore: number; againstScore: number }> = [];
    if (match.homeEntryId === entryAId && match.awayEntryId === entryBId) {
      pairs.push({ id: entryAId, opponentId: entryBId, forScore: match.homeScore, againstScore: match.awayScore });
      pairs.push({ id: entryBId, opponentId: entryAId, forScore: match.awayScore, againstScore: match.homeScore });
    } else if (match.homeEntryId === entryBId && match.awayEntryId === entryAId) {
      pairs.push({ id: entryBId, opponentId: entryAId, forScore: match.homeScore, againstScore: match.awayScore });
      pairs.push({ id: entryAId, opponentId: entryBId, forScore: match.awayScore, againstScore: match.homeScore });
    }
    for (const pair of pairs) {
      const row = byEntry.get(pair.id) ?? createHeadToHeadRow(entries, pair.id, pair.opponentId);
      row.played += 1;
      row.goalsFor += pair.forScore;
      row.goalsAgainst += pair.againstScore;
      if (pair.forScore > pair.againstScore) row.wins += 1;
      else if (pair.forScore < pair.againstScore) row.losses += 1;
      else row.draws += 1;
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      row.percentage = formatPercentage(row.played, row.wins);
      byEntry.set(pair.id, row);
    }
  }
  for (const row of byEntry.values()) rows.push(row);
  return rankSort(rows, (row) => row.wins);
}

function createHeadToHeadRow(
  entries: MatchEntry[],
  entryId: string,
  opponentEntryId: string
): HeadToHeadRow {
  const identity = teamIdentity(entries, entryId);
  const opponent = teamIdentity(entries, opponentEntryId);
  return {
    entryId,
    displayName: identity.displayName,
    teamId: identity.teamId,
    opponentEntryId,
    opponentDisplayName: opponent.displayName,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    percentage: null
  };
}

export function computeHighlights(
  playerStatistics: PlayerStatistic[],
  sport: string
): Highlight[] {
  if (!playerStatistics.length) return [];
  const highlights: Highlight[] = [];
  const byGoals = rankSort(playerStatistics, (stat) => stat.goals);
  if ((byGoals[0]?.goals ?? 0) > 0) {
    highlights.push({ category: "top_scorer", sport, label: "Artilheiro", rank: 1, player: byGoals[0]! });
  }
  const byPoints = rankSort(playerStatistics, (stat) => stat.points);
  if ((byPoints[0]?.points ?? 0) > 0) {
    highlights.push({ category: "leader_points", sport, label: "Líder em pontos", rank: 1, player: byPoints[0]! });
  }
  const byAces = rankSort(playerStatistics, (stat) => stat.aces);
  if ((byAces[0]?.aces ?? 0) > 0) {
    highlights.push({ category: "leader_aces", sport, label: "Líder de aces", rank: 1, player: byAces[0]! });
  }
  const byBlocks = rankSort(playerStatistics, (stat) => stat.blocks);
  if ((byBlocks[0]?.blocks ?? 0) > 0) {
    highlights.push({ category: "leader_blocks", sport, label: "Líder de bloqueios", rank: 1, player: byBlocks[0]! });
  }
  return highlights;
}

export function paginate<T>(rows: T[], page: number, limit: number): Page<T> {
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 1 : limit;
  const start = (safePage - 1) * safeLimit;
  return {
    items: rows.slice(start, start + safeLimit),
    total: rows.length,
    page: safePage,
    limit: safeLimit
  };
}




