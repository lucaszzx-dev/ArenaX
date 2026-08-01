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

describe("Volleyball set -> match score linking", () => {
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
    periodService = new MatchPeriodService(periods, matches, championships, matchService);
  });

  it("finalizes the match when a team reaches the required sets (best of 5)", async () => {
    const { championshipId, matchId } = await createMatch();
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 1, homeScore: 25, awayScore: 20 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 2, homeScore: 25, awayScore: 18 });

    let current = await matches.findById(matchId);
    expect(current!.status).toBe("SCHEDULED");
    expect(current!.homeScore).toBeNull();

    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 25, awayScore: 22 });

    current = await matches.findById(matchId);
    expect(current!.status).toBe("FINISHED");
    expect(current!.homeScore).toBe(3);
    expect(current!.awayScore).toBe(0);
  });

  it("blocks saving an extra set after the match is decided", async () => {
    const { championshipId, matchId } = await createMatch();
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 1, homeScore: 25, awayScore: 20 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 2, homeScore: 25, awayScore: 18 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 25, awayScore: 22 });

    await expect(
      periodService.save("organizer-1", championshipId, matchId, { periodNumber: 4, homeScore: 25, awayScore: 20 })
    ).rejects.toThrow();
  });

  it("recalculates the outcome when an existing set is edited", async () => {
    const { championshipId, matchId } = await createMatch();
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 1, homeScore: 25, awayScore: 20 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 2, homeScore: 25, awayScore: 18 });
    // Away wins set 3 first, keeping the match open (2x1).
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 20, awayScore: 25 });

    let current = await matches.findById(matchId);
    expect(current!.status).toBe("SCHEDULED");

    // Edit set 3 so home wins it and clinches the match.
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 25, awayScore: 22 });

    current = await matches.findById(matchId);
    expect(current!.status).toBe("FINISHED");
    expect(current!.homeScore).toBe(3);
    expect(current!.awayScore).toBe(0);
  });

  it("reopens the match and clears the score when the decisive set is deleted", async () => {
    const { championshipId, matchId } = await createMatch();
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 1, homeScore: 25, awayScore: 20 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 2, homeScore: 25, awayScore: 18 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 25, awayScore: 22 });

    let current = await matches.findById(matchId);
    expect(current!.status).toBe("FINISHED");

    await periodService.delete("organizer-1", championshipId, matchId, 3);

    current = await matches.findById(matchId);
    expect(current!.status).toBe("SCHEDULED");
    expect(current!.homeScore).toBeNull();
    expect(current!.awayScore).toBeNull();
  });

  it("uses a 15-point tie-break when bestOfSets is 3 (set 3)", async () => {
    const { championshipId, matchId } = await createMatch({ bestOfSets: 3 });
    await expect(
      periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 14, awayScore: 13 })
    ).rejects.toThrow();
    const period = await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 3, homeScore: 15, awayScore: 13 });
    expect(period).toMatchObject({ homeScore: 15, awayScore: 13 });
  });

  it("finalizes a best-of-3 match after two set wins", async () => {
    const { championshipId, matchId } = await createMatch({ bestOfSets: 3 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 1, homeScore: 25, awayScore: 20 });
    await periodService.save("organizer-1", championshipId, matchId, { periodNumber: 2, homeScore: 25, awayScore: 18 });

    const current = await matches.findById(matchId);
    expect(current!.status).toBe("FINISHED");
    expect(current!.homeScore).toBe(2);
    expect(current!.awayScore).toBe(0);
  });

  async function createMatch(overrides: { bestOfSets?: number } = {}) {
    const arena = await championships.create("organizer-1", { ...arenaInput, ...overrides });
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });
    return { championshipId: arena.id, matchId: match.id };
  }
});

describe("Volleyball error categorization", () => {
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

  it("accepts categorized error events for volleyball", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({ id: "entry-home", championshipId: arenaId, teamId: "team-home" });
    events.members.push({ id: "member-home", teamId: "team-home", displayName: "Jogador" });

    for (const type of ["ERROR", "SERVE_ERROR", "ATTACK_ERROR", "RECEPTION_ERROR"] as const) {
      const event = await eventService.create("organizer-1", arenaId, matchId, {
        entryId: "entry-home",
        teamMemberId: "member-home",
        type,
        periodNumber: 1,
        clockSeconds: null,
        notes: null
      });
      expect(event).toMatchObject({ type, value: 0 });
    }
  });

  it("counts categorized errors as events without awarding points", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({ id: "entry-home", championshipId: arenaId, teamId: "team-home" });
    events.members.push({ id: "member-1", teamId: "team-home", displayName: "Camisa 1" });

    await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "member-1", type: "SERVE_ERROR", periodNumber: 1, clockSeconds: null, notes: null
    });
    await eventService.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "member-1", type: "ATTACK_ERROR", periodNumber: 1, clockSeconds: null, notes: null
    });

    const stats = await eventService.statisticsPublic(arenaId, "V\u00f4lei");
    expect(stats[0]).toMatchObject({ actorName: "Camisa 1", points: 0, events: 2 });
  });

  async function createMatch() {
    const arena = await championships.create("organizer-1", arenaInput);
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    matches.members.push({ id: "member-home", teamId: "team-home", displayName: "Jogador" });
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });
    return { arenaId: arena.id, matchId: match.id };
  }
});