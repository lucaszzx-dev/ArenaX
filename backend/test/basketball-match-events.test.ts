import { beforeEach, describe, expect, it } from "vitest";

import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import { MatchEventService } from "../src/match-events/match-event-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

const arenaInput: ChampionshipInput = {
  name: "Liga de Basquete",
  sport: "Basquete",
  description: null,
  entryType: "TEAM",
  winPoints: 2,
  drawPoints: 0,
  lossPoints: 0,
  allowsDraw: false,
  thirdPlace: false,
  maxYellowCards: 0,
  startsAt: null,
  endsAt: null
};

describe("Basketball match events", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let events: InMemoryMatchEventRepository;
  let matchService: MatchService;
  let service: MatchEventService;

  beforeEach(async () => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    matches = new InMemoryMatchRepository();
    events = new InMemoryMatchEventRepository();
    matchService = new MatchService(matches, championships);
    service = new MatchEventService(events, matches, championships);
  });

  async function createBasketballMatch() {
    const arena = await championships.create("organizer-1", arenaInput);
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Wolves" },
      { id: "entry-away", championshipId: arena.id, displayName: "Eagles" }
    );
    events.entries.push(
      { id: "entry-home", championshipId: arena.id, teamId: "team-home" },
      { id: "entry-away", championshipId: arena.id, teamId: "team-away" }
    );
    events.members.push(
      { id: "player-home-1", teamId: "team-home", displayName: "Ala" },
      { id: "player-home-2", teamId: "team-home", displayName: "Pivo" },
      { id: "player-away-1", teamId: "team-away", displayName: "Armador" }
    );
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });
    return { arenaId: arena.id, matchId: match.id };
  }

  it("records a free throw worth 1 point", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    const event = await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "player-home-1",
      type: "FREE_THROW",
      periodNumber: 1,
      clockSeconds: 120,
      notes: null
    });
    expect(event).toMatchObject({ type: "FREE_THROW", value: 1 });
  });

  it("records a two-point shot worth 2 points", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    const event = await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "player-home-1",
      type: "TWO_POINT_SHOT",
      periodNumber: 1,
      clockSeconds: 300,
      notes: null
    });
    expect(event).toMatchObject({ type: "TWO_POINT_SHOT", value: 2 });
  });

  it("records a three-point shot worth 3 points", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    const event = await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: null,
      type: "THREE_POINT_SHOT",
      periodNumber: 2,
      clockSeconds: 60,
      notes: null
    });
    expect(event).toMatchObject({ type: "THREE_POINT_SHOT", value: 3 });
  });

  it("records a personal foul", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    const event = await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "player-home-1",
      type: "PERSONAL_FOUL",
      periodNumber: 1,
      clockSeconds: 180,
      notes: null
    });
    expect(event).toMatchObject({ type: "PERSONAL_FOUL", value: 0 });
  });

  it("rejects a football event in basketball", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    await expect(service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: null,
      type: "GOAL",
      periodNumber: 1,
      clockSeconds: null,
      notes: null
    })).rejects.toMatchObject({ code: "INVALID_MATCH_EVENT_TYPE" });
  });

  it("calculates total score from events for a team", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    // Home team scores: 3 free throws + 2 two-pointers + 1 three-pointer = 3*1 + 2*2 + 1*3 = 10
    for (let i = 0; i < 3; i++) {
      await service.create("organizer-1", arenaId, matchId, {
        entryId: "entry-home", teamMemberId: null,
        type: "FREE_THROW", periodNumber: 1, clockSeconds: null, notes: null
      });
    }
    for (let i = 0; i < 2; i++) {
      await service.create("organizer-1", arenaId, matchId, {
        entryId: "entry-home", teamMemberId: null,
        type: "TWO_POINT_SHOT", periodNumber: 2, clockSeconds: null, notes: null
      });
    }
    await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: null,
      type: "THREE_POINT_SHOT", periodNumber: 3, clockSeconds: null, notes: null
    });

    const matchEvents = await service.list("organizer-1", arenaId, matchId);
    const homeScore = matchEvents
      .filter((e) => e.entryId === "entry-home")
      .reduce((sum, e) => sum + e.value, 0);
    expect(homeScore).toBe(10);
  });

  it("calculates player statistics including fouls", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "player-home-1",
      type: "FREE_THROW", periodNumber: 1, clockSeconds: null, notes: null
    });
    await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "player-home-1",
      type: "TWO_POINT_SHOT", periodNumber: 2, clockSeconds: null, notes: null
    });
    await service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home", teamMemberId: "player-home-1",
      type: "PERSONAL_FOUL", periodNumber: 2, clockSeconds: null, notes: null
    });

    const stats = await service.statisticsPublic(arenaId, "Basquete");
    const playerStats = stats.find((s) => s.teamMemberId === "player-home-1");
    expect(playerStats).toBeDefined();
    expect(playerStats?.points).toBe(3); // FT(1) + 2PT(2)
    expect(playerStats?.personalFouls).toBe(1);
    expect(playerStats?.events).toBe(3);
  });

  it("rejects a player from the opposing team", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    await expect(service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: "player-away-1",
      type: "FREE_THROW",
      periodNumber: 1,
      clockSeconds: null,
      notes: null
    })).rejects.toMatchObject({ code: "EVENT_MEMBER_NOT_IN_ENTRY" });
  });

  it("requires reopening a finished match before changing events", async () => {
    const { arenaId, matchId } = await createBasketballMatch();
    await matchService.recordScore("organizer-1", arenaId, matchId, 10, 8);
    await expect(service.create("organizer-1", arenaId, matchId, {
      entryId: "entry-home",
      teamMemberId: null,
      type: "FREE_THROW",
      periodNumber: 1,
      clockSeconds: null,
      notes: null
    })).rejects.toMatchObject({ code: "MATCH_EVENT_REQUIRES_SCHEDULED_MATCH" });
  });
});
