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

describe("MatchEventService", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let events: InMemoryMatchEventRepository;
  let matchService: MatchService;
  let service: MatchEventService;

  beforeEach(() => {
    championships = new ChampionshipService(
      new InMemoryChampionshipRepository()
    );
    matches = new InMemoryMatchRepository();
    events = new InMemoryMatchEventRepository();
    matchService = new MatchService(matches, championships);
    service = new MatchEventService(events, matches, championships);
  });

  it("records a goal and preserves the player's name", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push(
      { id: "entry-home", championshipId: arenaId, teamId: "team-home" },
      { id: "entry-away", championshipId: arenaId, teamId: "team-away" }
    );
    events.members.push({
      id: "member-home",
      teamId: "team-home",
      displayName: "Camisa 10"
    });

    const event = await service.create(
      "organizer-1",
      arenaId,
      matchId,
      {
        entryId: "entry-home",
        teamMemberId: "member-home",
        type: "GOAL",
        periodNumber: 1,
        clockSeconds: 12 * 60,
        notes: null
      }
    );

    expect(event).toMatchObject({
      entryId: "entry-home",
      actorName: "Camisa 10",
      type: "GOAL",
      value: 1
    });
  });

  it("accepts an event without a known player", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({
      id: "entry-home",
      championshipId: arenaId,
      teamId: "team-home"
    });

    const event = await service.create(
      "organizer-1",
      arenaId,
      matchId,
      {
        entryId: "entry-home",
        teamMemberId: null,
        type: "YELLOW_CARD",
        periodNumber: null,
        clockSeconds: null,
        notes: null
      }
    );

    expect(event.actorName).toBeNull();
  });

  it("rejects a player from the opposing team", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({
      id: "entry-home",
      championshipId: arenaId,
      teamId: "team-home"
    });
    events.members.push({
      id: "member-away",
      teamId: "team-away",
      displayName: "Adversário"
    });

    await expect(service.create(
      "organizer-1",
      arenaId,
      matchId,
      {
        entryId: "entry-home",
        teamMemberId: "member-away",
        type: "GOAL",
        periodNumber: 1,
        clockSeconds: 60,
        notes: null
      }
    )).rejects.toMatchObject({ code: "EVENT_MEMBER_NOT_IN_ENTRY" });
  });

  it("rejects an entry that does not play the match", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({
      id: "entry-other",
      championshipId: arenaId,
      teamId: "team-other"
    });

    await expect(service.create(
      "organizer-1",
      arenaId,
      matchId,
      {
        entryId: "entry-other",
        teamMemberId: null,
        type: "GOAL",
        periodNumber: 1,
        clockSeconds: 60,
        notes: null
      }
    )).rejects.toMatchObject({ code: "EVENT_ENTRY_NOT_IN_MATCH" });
  });

  it("requires reopening a finished match before changing its events", async () => {
    const { arenaId, matchId } = await createMatch();
    events.entries.push({
      id: "entry-home",
      championshipId: arenaId,
      teamId: "team-home"
    });
    await matchService.recordScore(
      "organizer-1",
      arenaId,
      matchId,
      1,
      0
    );

    await expect(service.create(
      "organizer-1",
      arenaId,
      matchId,
      {
        entryId: "entry-home",
        teamMemberId: null,
        type: "GOAL",
        periodNumber: 1,
        clockSeconds: 60,
        notes: null
      }
    )).rejects.toMatchObject({
      code: "MATCH_EVENT_REQUIRES_SCHEDULED_MATCH"
    });
  });

  it("records a three-point shot in basketball", async () => {
    const arena = await championships.create("organizer-1", {
      ...arenaInput,
      sport: "Basquete"
    });
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });

    events.entries.push({
      id: "entry-home",
      championshipId: arena.id,
      teamId: "team-home"
    });

    const event = await service.create(
      "organizer-1",
      arena.id,
      match.id,
      {
        entryId: "entry-home",
        teamMemberId: null,
        type: "THREE_POINT_SHOT",
        periodNumber: 1,
        clockSeconds: 60,
        notes: null
      }
    );

    expect(event).toMatchObject({
      type: "THREE_POINT_SHOT",
      value: 3
    });
  });

  it("rejects a football event in basketball", async () => {
    const arena = await championships.create("organizer-1", {
      ...arenaInput,
      sport: "Basquete"
    });
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    events.entries.push({
      id: "entry-home",
      championshipId: arena.id,
      teamId: "team-home"
    });
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });

    await expect(service.create("organizer-1", arena.id, match.id, {
      entryId: "entry-home",
      teamMemberId: null,
      type: "GOAL",
      periodNumber: 1,
      clockSeconds: null,
      notes: null
    })).rejects.toMatchObject({ code: "INVALID_MATCH_EVENT_TYPE" });
  });

  it("records an ace in a volleyball set", async () => {
    const arena = await championships.create("organizer-1", {
      ...arenaInput,
      sport: "Vôlei"
    });
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    events.entries.push({
      id: "entry-home",
      championshipId: arena.id,
      teamId: "team-home"
    });
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });

    const event = await service.create("organizer-1", arena.id, match.id, {
      entryId: "entry-home",
      teamMemberId: null,
      type: "ACE",
      periodNumber: 3,
      clockSeconds: null,
      notes: null
    });

    expect(event).toMatchObject({
      type: "ACE",
      periodNumber: 3,
      value: 1
    });
  });

  async function createMatch() {
    const arena = await championships.create("organizer-1", arenaInput);
    matches.entries.push(
      { id: "entry-home", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-away", championshipId: arena.id, displayName: "Raio" }
    );
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-home",
      awayEntryId: "entry-away",
      scheduledAt: null
    });
    return { arenaId: arena.id, matchId: match.id };
  }
});
