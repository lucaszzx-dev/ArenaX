import { beforeEach, describe, expect, it } from "vitest";

import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import type { Match, MatchEntry } from "../src/matches/match-repository.js";
import type { MatchEvent } from "../src/match-events/match-event-repository.js";
import { StatisticsService } from "../src/match-events/statistics-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

const arenaInput: ChampionshipInput = {
  name: "Copa ArenaX",
  sport: "Futsal",
  description: null,
  entryType: "TEAM",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowsDraw: true,
  startsAt: null,
  endsAt: null
};

describe("StatisticsService", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let events: InMemoryMatchEventRepository;
  let service: StatisticsService;
  let arenaId: string;

  beforeEach(async () => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    matches = new InMemoryMatchRepository();
    events = new InMemoryMatchEventRepository();
    service = new StatisticsService(events, matches, championships);
    const arena = await championships.create("organizer-1", arenaInput);
    arenaId = arena.id;
  });

  function addEntry(id: string, displayName: string, teamId: string | null = null): MatchEntry {
    const entry = { id, championshipId: arenaId, displayName, teamId };
    matches.entries.push(entry);
    events.entries.push({ id, championshipId: arenaId, teamId });
    return entry;
  }

  function finishMatch(
    id: string,
    homeEntryId: string,
    awayEntryId: string,
    homeScore: number,
    awayScore: number
  ): Match {
    const now = new Date();
    const homeEntry = matches.entries.find((entry) => entry.id === homeEntryId)!;
    const awayEntry = matches.entries.find((entry) => entry.id === awayEntryId)!;
    const match: Match = {
      id,
      championshipId: arenaId,
      homeEntryId,
      awayEntryId,
      scheduledAt: null,
      status: "FINISHED",
      homeScore,
      awayScore,
      roundNumber: null,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry,
      awayEntry
    };
    matches.matches.push(match);
    return match;
  }

  function canceledMatch(id: string, homeEntryId: string, awayEntryId: string): Match {
    const now = new Date();
    const homeEntry = matches.entries.find((entry) => entry.id === homeEntryId)!;
    const awayEntry = matches.entries.find((entry) => entry.id === awayEntryId)!;
    const match: Match = {
      id,
      championshipId: arenaId,
      homeEntryId,
      awayEntryId,
      scheduledAt: null,
      status: "CANCELED",
      homeScore: null,
      awayScore: null,
      roundNumber: null,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry,
      awayEntry
    };
    matches.matches.push(match);
    return match;
  }

  function finishedWithoutScore(id: string, homeEntryId: string, awayEntryId: string): Match {
    const now = new Date();
    const homeEntry = matches.entries.find((entry) => entry.id === homeEntryId)!;
    const awayEntry = matches.entries.find((entry) => entry.id === awayEntryId)!;
    const match: Match = {
      id,
      championshipId: arenaId,
      homeEntryId,
      awayEntryId,
      scheduledAt: null,
      status: "FINISHED",
      homeScore: null,
      awayScore: null,
      roundNumber: null,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry,
      awayEntry
    };
    matches.matches.push(match);
    return match;
  }

  function addEvent(
    matchId: string,
    entryId: string,
    memberId: string | null,
    actorName: string,
    type: MatchEvent["type"],
    value: number
  ): MatchEvent {
    const event: MatchEvent = {
      id: crypto.randomUUID(),
      matchId,
      entryId,
      teamMemberId: memberId,
      actorName,
      type,
      value,
      periodNumber: 1,
      clockSeconds: null,
      notes: null,
      relatedEventId: null,
      createdAt: new Date()
    };
    events.events.push(event);
    return event;
  }

  it("computes club standings with aproveitamento, points and streaks", async () => {
    const teamA = addEntry("entry-a", "Azul", "team-a");
    const teamB = addEntry("entry-b", "Raio", "team-b");
    const teamC = addEntry("entry-c", "Cometa", "team-c");

    finishMatch("m1", teamA.id, teamB.id, 2, 1); // A win
    finishMatch("m2", teamA.id, teamC.id, 3, 1); // A win
    finishMatch("m3", teamB.id, teamA.id, 1, 1); // A draw
    finishMatch("m4", teamB.id, teamC.id, 0, 2); // C win

    const standings = await service.clubStandings(arenaId);

    const a = standings.find((row) => row.entryId === "entry-a")!;
    expect(a.played).toBe(3);
    expect(a.wins).toBe(2);
    expect(a.draws).toBe(1);
    expect(a.losses).toBe(0);
    expect(a.points).toBe(7);
    expect(a.percentage).toBe(233.33);
    expect(a.currentStreakType).toBe("D");
    expect(a.currentStreak).toBe(1);
    expect(a.maxWinStreak).toBe(2);

    const c = standings.find((row) => row.entryId === "entry-c")!;
    expect(c.played).toBe(2);
    expect(c.points).toBe(3);
    expect(c.percentage).toBe(150);
    expect(c.maxWinStreak).toBe(1);
    expect(c.currentStreakType).toBe("W");

    expect(standings[0]?.entryId).toBe("entry-a");
  });

  it("ignores CANCELED and FINISHED matches without score", async () => {
    const teamA = addEntry("entry-a", "Azul", "team-a");
    const teamB = addEntry("entry-b", "Raio", "team-b");
    const teamC = addEntry("entry-c", "Cometa", "team-c");

    finishMatch("m1", teamA.id, teamB.id, 2, 1); // counts
    canceledMatch("m2", teamA.id, teamC.id); // must not count
    finishedWithoutScore("m3", teamB.id, teamC.id); // must not count

    const standings = await service.clubStandings(arenaId);
    const a = standings.find((row) => row.entryId === "entry-a")!;
    const b = standings.find((row) => row.entryId === "entry-b")!;
    const c = standings.find((row) => row.entryId === "entry-c")!;

    expect(a.played).toBe(1);
    expect(a.wins).toBe(1);
    expect(b.played).toBe(1);
    expect(b.losses).toBe(1);
    expect(c.played).toBe(0);
  });

  it("computes head-to-head between two entries", async () => {
    const teamA = addEntry("entry-a", "Azul", "team-a");
    const teamB = addEntry("entry-b", "Raio", "team-b");

    finishMatch("m1", teamA.id, teamB.id, 2, 1);
    finishMatch("m2", teamB.id, teamA.id, 3, 3);
    finishMatch("m3", teamA.id, teamB.id, 0, 2);
    finishMatch("m4", teamA.id, teamB.id, 1, 1);

    const rows = await service.headToHead(arenaId, "entry-a", "entry-b");
    const a = rows.find((row) => row.entryId === "entry-a")!;
    const b = rows.find((row) => row.entryId === "entry-b")!;

    expect(rows).toHaveLength(2);
    expect(a).toMatchObject({
      opponentEntryId: "entry-b",
      played: 4,
      wins: 1,
      draws: 2,
      losses: 1,
      goalsFor: 6,
      goalsAgainst: 7,
      goalDifference: -1,
      percentage: 25
    });
    expect(b.opponentEntryId).toBe("entry-a");
    expect(b.wins).toBe(1);
    expect(b.draws).toBe(2);
    expect(b.losses).toBe(1);
  });

  it("excludes canceled matches from head-to-head", async () => {
    const teamA = addEntry("entry-a", "Azul", "team-a");
    const teamB = addEntry("entry-b", "Raio", "team-b");

    finishMatch("m1", teamA.id, teamB.id, 1, 0);
    canceledMatch("m2", teamA.id, teamB.id);

    const rows = await service.headToHead(arenaId, "entry-a", "entry-b");
    const a = rows.find((row) => row.entryId === "entry-a")!;
    expect(a.played).toBe(1);
  });

  it("returns highlights for top scorer, points, aces and blocks", async () => {
    const teamA = addEntry("entry-a", "Azul", "team-a");
    const teamB = addEntry("entry-b", "Raio", "team-b");
    finishMatch("m1", teamA.id, teamB.id, 3, 0);

    addEvent("m1", "entry-a", "member-a", "Atacante A", "GOAL", 1);
    addEvent("m1", "entry-a", "member-a", "Atacante A", "GOAL", 1);
    addEvent("m1", "entry-a", "member-a", "Atacante A", "GOAL", 1);

    const highlights = await service.highlights(arenaId);
    expect(highlights.some((h) => h.category === "top_scorer")).toBe(true);
    const scorer = highlights.find((h) => h.category === "top_scorer")!;
    expect(scorer.player.actorName).toBe("Atacante A");
    expect(scorer.player.goals).toBe(3);
  });

  it("publishes volleyball aces highlight", async () => {
    const volleyball = await championships.create("organizer-1", {
      ...arenaInput,
      sport: "Vôlei"
    });
    const arena = volleyball;
    matches.entries.push({ id: "entry-a", championshipId: arena.id, displayName: "Azul" });
    matches.entries.push({ id: "entry-b", championshipId: arena.id, displayName: "Raio" });
    events.entries.push({ id: "entry-a", championshipId: arena.id, teamId: null });
    events.entries.push({ id: "entry-b", championshipId: arena.id, teamId: null });
    const now = new Date();
    matches.matches.push({
      id: "v1",
      championshipId: arena.id,
      homeEntryId: "entry-a",
      awayEntryId: "entry-b",
      scheduledAt: null,
      status: "FINISHED",
      homeScore: 3,
      awayScore: 1,
      roundNumber: null,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry: matches.entries[0]!,
      awayEntry: matches.entries[1]!
    });
    events.events.push({
      id: crypto.randomUUID(),
      matchId: "v1",
      entryId: "entry-a",
      teamMemberId: "member-a",
      actorName: "Saqueador",
      type: "ACE",
      value: 1,
      periodNumber: 1,
      clockSeconds: null,
      notes: null,
      relatedEventId: null,
      createdAt: new Date()
    });

    const service2 = new StatisticsService(events, matches, championships);
    const highlights = await service2.highlights(arena.id);
    const aces = highlights.find((h) => h.category === "leader_aces")!;
    expect(aces.player.actorName).toBe("Saqueador");
    expect(aces.player.aces).toBe(1);
  });

  it("paginates player statistics", async () => {
    const teamA = addEntry("entry-a", "Azul", "team-a");
    const teamB = addEntry("entry-b", "Raio", "team-b");
    finishMatch("m1", teamA.id, teamB.id, 2, 0);

    addEvent("m1", "entry-a", "member-a", "Jogador A", "GOAL", 1);
    addEvent("m1", "entry-a", "member-a", "Jogador A", "GOAL", 1);
    addEvent("m1", "entry-b", "member-b", "Jogador B", "YELLOW_CARD", 1);

    const page = await service.statistics(arenaId, {}, 1, 1);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
    expect(page.page).toBe(1);
    expect(page.limit).toBe(1);
    expect(page.items[0]?.actorName).toBe("Jogador A");
  });

  it("blocks another organizer from reading statistics", async () => {
    addEntry("entry-a", "Azul", "team-a");
    addEntry("entry-b", "Raio", "team-b");

    await expect(
      service.statistics(arenaId, {}, 1, 20, "organizer-2")
    ).rejects.toMatchObject({ code: "CHAMPIONSHIP_NOT_FOUND" });
    await expect(
      service.clubStandings(arenaId, {}, "organizer-2")
    ).rejects.toMatchObject({ code: "CHAMPIONSHIP_NOT_FOUND" });
    await expect(
      service.headToHead(arenaId, "entry-a", "entry-b", "organizer-2")
    ).rejects.toMatchObject({ code: "CHAMPIONSHIP_NOT_FOUND" });
    await expect(
      service.ranking(arenaId, "scorer", {}, 1, 20, "organizer-2")
    ).rejects.toMatchObject({ code: "CHAMPIONSHIP_NOT_FOUND" });
  });
});

