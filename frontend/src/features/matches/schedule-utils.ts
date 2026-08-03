import type { ArenaMatch } from "./match-api";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function matchDateKey(scheduledAt: string | null): string | null {
  if (!scheduledAt) return null;
  return toLocalDateKey(new Date(scheduledAt));
}

export function isToday(scheduledAt: string | null): boolean {
  const key = matchDateKey(scheduledAt);
  return key !== null && key === toLocalDateKey(new Date());
}

export function matchesToday(matches: ArenaMatch[]): ArenaMatch[] {
  return matches.filter((match) => isToday(match.scheduledAt));
}

export function upcomingMatches(matches: ArenaMatch[]): ArenaMatch[] {
  const now = Date.now();
  const todayKey = toLocalDateKey(new Date());
  return matches
    .filter(
      (match) =>
        match.status === "SCHEDULED" &&
        match.scheduledAt !== null &&
        (matchDateKey(match.scheduledAt)! > todayKey ||
          new Date(match.scheduledAt).getTime() >= now)
    )
    .sort(
      (a, b) =>
        (a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0) -
        (b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0)
    );
}

export function recentResults(matches: ArenaMatch[], limit = 6): ArenaMatch[] {
  return matches
    .filter(
      (match) =>
        match.status === "FINISHED" &&
        match.homeScore !== null &&
        match.awayScore !== null
    )
    .sort(
      (a, b) =>
        (b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0) -
        (a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0)
    )
    .slice(0, limit);
}

export type CalendarRound = {
  roundNumber: number | null;
  dates: Array<{
    dateKey: string | null;
    label: string;
    matches: ArenaMatch[];
  }>;
};

export function buildCalendar(matches: ArenaMatch[]): CalendarRound[] {
  const byRound = new Map<number | null, Map<string | null, ArenaMatch[]>>();
  for (const match of matches) {
    const round = byRound.get(match.roundNumber ?? null) ?? new Map();
    const key = matchDateKey(match.scheduledAt);
    const list = round.get(key) ?? [];
    list.push(match);
    round.set(key, list);
    byRound.set(match.roundNumber ?? null, round);
  }

  const rounds = [...byRound.entries()].sort(
    ([a], [b]) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER)
  );

  return rounds.map(([roundNumber, dateMap]) => ({
    roundNumber,
    dates: [...dateMap.entries()]
      .sort(([a], [b]) => (a ?? "").localeCompare(b ?? ""))
      .map(([dateKey, list]) => ({
        dateKey,
        label: dateKey
          ? new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "short",
              year: "numeric"
            }).format(new Date(`${dateKey}T12:00:00`))
          : "Data a definir",
        matches: list
      }))
  }));
}

export function formatMatchDateTime(scheduledAt: string | null): string {
  if (!scheduledAt) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(scheduledAt));
}
