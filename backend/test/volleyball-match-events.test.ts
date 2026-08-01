import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { MatchEventService } from "../src/match-events/match-event-service.js";
import { MatchPeriodService } from "../src/match-periods/match-period-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchPeriodRepository } from "./support/in-memory-match-period-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

const arenaInput = {
  name: "Copa ArenaX",
  sport: "V\u00f4lei",
  description: null,
  entryType: "TEAM" as const,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowsDraw: true,
  startsAt: null,
  endsAt: null
};

describe("Volleyball match events", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let events: InMemoryMatchEventRepository;
  let matchService: MatchService;
  let eventService: MatchEventService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    matches = new InMemoryMatchRepository();
    events = new InMemoryMatchEventRepository();
    matchService = new MatchService(matches, championships);
    eventService = new MatchEventService(events, matches, championships);
  });

  it("records a VOLLEYBALL_POINT event", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" },
      { id: "entry-away", championshipId: arenaId, teamId: "team-away" }
    );
    events.members.push({ id: "member-home", teamId: "team-home", displayName: "Jogador A" });

    const event = await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "member-home",
      type: "VOLLEYBALL_POINT",
      periodNumber: 1,
      clockSeconds: null,
      notes: null
    });

    expect(event).toMatchObject({ type: "VOLLEYBALL_POINT", value: 1, periodNumber: 1 });
  });

  it("records an ACE event", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" },
      { id: "entry-away", championshipId: arenaId, teamId: "team-away" }
    );
    events.members.push({ id: "member-home", teamId: "team-home", displayName: "Saque" });

    const event = await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "member-home",
      type: "ACE",
      periodNumber: 2,
      clockSeconds: null,
      notes: null
    });

    expect(event).toMatchObject({ type: "ACE", value: 1 });
  });

  it("records a BLOCK event", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" },
      { id: "entry-away", championshipId: arenaId, teamId: "team-away" }
    );
    events.members.push({ id: "member-home", teamId: "team-home", displayName: "Bloqueio" });

    const event = await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "member-home",
      type: "BLOCK",
      periodNumber: 3,
      clockSeconds: null,
      notes: null
    });

    expect(event).toMatchObject({ type: "BLOCK", value: 1 });
  });

  it("records an ERROR event (no points)", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" },
      { id: "entry-away", championshipId: arenaId, teamId: "team-away" }
    );
    events.members.push({ id: "member-home", teamId: "team-home", displayName: "Erro" });

    const event = await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "member-home",
      type: "ERROR",
      periodNumber: 1,
      clockSeconds: null,
      notes: null
    });

    expect(event).toMatchObject({ type: "ERROR", value: 0 });
  });

  it("records a SPIKE event", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" },
      { id: "entry-away", championshipId: arenaId, teamId: "team-away" }
    );
    events.members.push({ id: "member-home", teamId: "team-home", displayName: "Atacante" });

    const event = await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "member-home",
      type: "SPIKE",
      periodNumber: 2,
      clockSeconds: null,
      notes: null
    });

    expect(event).toMatchObject({ type: "SPIKE", value: 1 });
  });

  it("calculates per-player volleyball statistics", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" }
    );
    events.members.push({ id: "member-1", teamId: "team-home", displayName: "Camisa 1" });

    await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "member-1",
      type: "VOLLEYBALL_POINT", periodNumber: 1, clockSeconds: null, notes: null
    });
    await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "member-1",
      type: "ACE", periodNumber: 1, clockSeconds: null, notes: null
    });
    await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "member-1",
      type: "BLOCK", periodNumber: 1, clockSeconds: null, notes: null
    });
    await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "member-1",
      type: "SPIKE", periodNumber: 1, clockSeconds: null, notes: null
    });

    const stats = await eventService.statisticsPublic(arenaId, "V\u00f4lei");
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      actorName: "Camisa 1",
      points: 4,
      aces: 1,
      blocks: 1,
      events: 4
    });
  });

  it("rejects football event types for volleyball", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({ id: "entry-home", championshipId: arenaId, teamId: "team-home" });

    await expect(eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: null,
      type: "GOAL", periodNumber: 1, clockSeconds: null, notes: null
    })).rejects.toMatchObject({ code: "INVALID_MATCH_EVENT_TYPE" });
  });

  async function createMatch() {
    const arena = await championships.create("organizer-1", arenaInput);
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    matches.members.push(
      { id: "member-home", teamId: "team-home", displayName: "Jogador" }
    );
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });
    return { arenaId: arena.id, matchId: match.id };
  }
});

describe("Volleyball set validation", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let periods: InMemoryMatchPeriodRepository;
  let matchService: MatchService;
  let periodService: MatchPeriodService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    matches = new InMemoryMatchRepository();
    periods = new InMemoryMatchPeriodRepository();
    matchService = new MatchService(matches, championships);
    periodService = new MatchPeriodService(periods, matches, championships);
  });

  it("saves a valid volleyball set ending at 25-23", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    const period = await periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 1, homeScore: 25, awayScore: 23
    });
    expect(period).toMatchObject({ periodNumber: 1, homeScore: 25, awayScore: 23 });
  });

  it("rejects a tied volleyball set", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    await expect(periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 1, homeScore: 24, awayScore: 24
    })).rejects.toMatchObject({ code: "VOLLEYBALL_SET_CANNOT_DRAW" });
  });

  it("rejects a set without minimum 2-point difference", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    await expect(periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 1, homeScore: 25, awayScore: 24
    })).rejects.toMatchObject({ code: "VOLLEYBALL_SET_MIN_DIFFERENCE" });
  });

  it("allows a set above 25 with 2-point difference", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    const period = await periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 1, homeScore: 28, awayScore: 26
    });
    expect(period).toMatchObject({ homeScore: 28, awayScore: 26 });
  });

  it("uses 15-point target for tie-break (set 5 in best-of-5)", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    await expect(periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 5, homeScore: 14, awayScore: 13
    })).rejects.toThrow();
  });

  it("accepts a valid tie-break (set 5, 15-13)", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    const period = await periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 5, homeScore: 15, awayScore: 13
    });
    expect(period).toMatchObject({ homeScore: 15, awayScore: 13 });
  });

  it("accepts tie-break above 15 with 2-point difference", async () => {
    const { championshipId, matchId } = await createMatchWithSport("V\u00f4lei");
    const period = await periodService.save("organizer-1", championshipId, matchId, {
      periodNumber: 5, homeScore: 18, awayScore: 16
    });
    expect(period).toMatchObject({ homeScore: 18, awayScore: 16 });
  });

  async function createMatchWithSport(sport: string) {
    const arena = await championships.create("organizer-1", { ...arenaInput, sport });
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    matches.members.push(
      { id: "member-home", teamId: "team-home", displayName: "Jogador" }
    );
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });
    return { championshipId: arena.id, matchId: match.id };
  }
});