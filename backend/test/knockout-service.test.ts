import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { KnockoutService } from "../src/knockout/knockout-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryKnockoutRepository } from "./support/in-memory-knockout-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

describe("KnockoutService", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let knockoutRepository: InMemoryKnockoutRepository;
  let knockout: KnockoutService;
  let matchService: MatchService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    matches = new InMemoryMatchRepository();
    knockoutRepository = new InMemoryKnockoutRepository(matches);
    knockout = new KnockoutService(knockoutRepository, matches, championships);
    matchService = new MatchService(matches, championships, undefined, knockout);
  });

  async function createArena(entryCount: number) {
    const arena = await championships.create("organizer-1", {
      name: "Copa Eliminatória",
      sport: "Futsal",
      description: null,
      entryType: "TEAM",
      format: "KNOCKOUT",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowsDraw: true,
      startsAt: null,
      endsAt: null
    });
    for (let index = 1; index <= entryCount; index += 1) {
      matches.entries.push({
        id: `entry-${index}`,
        championshipId: arena.id,
        displayName: `Equipe ${index}`
      });
    }
    return arena;
  }

  it("creates a bracket and distributes byes", async () => {
    const arena = await createArena(3);
    const result = await knockout.generate("organizer-1", arena.id, false);

    expect(result).toMatchObject({
      totalRounds: 2,
      bracketSize: 4,
      byes: 1
    });
    expect(result.nodes).toHaveLength(3);
    expect(matches.matches).toHaveLength(1);
    const final = result.nodes.find((node) => node.roundNumber === 2);
    expect(final?.homeEntryId).toBe("entry-1");
  });

  it("advances a winner and creates the next confrontation", async () => {
    const arena = await createArena(3);
    await knockout.generate("organizer-1", arena.id, false);
    const semifinal = matches.matches[0];
    if (!semifinal) throw new Error("Semifinal ausente.");

    await matchService.recordScore(
      "organizer-1",
      arena.id,
      semifinal.id,
      2,
      0
    );

    expect(matches.matches).toHaveLength(2);
    const final = matches.matches.find((match) => match.roundNumber === 2);
    expect(final).toMatchObject({
      homeEntryId: "entry-1",
      awayEntryId: semifinal.homeEntryId,
      status: "SCHEDULED"
    });
  });

  it("blocks reopening after the next confrontation exists", async () => {
    const arena = await createArena(3);
    await knockout.generate("organizer-1", arena.id, false);
    const semifinal = matches.matches[0];
    if (!semifinal) throw new Error("Semifinal ausente.");
    await matchService.recordScore("organizer-1", arena.id, semifinal.id, 2, 0);

    await expect(matchService.changeMatchStatus(
      "organizer-1",
      arena.id,
      semifinal.id,
      "REOPEN"
    )).rejects.toMatchObject({
      code: "NEXT_KNOCKOUT_MATCH_ALREADY_CREATED"
    });
  });

  it("rejects manual matches and draws in knockout arenas", async () => {
    const arena = await createArena(2);
    await expect(matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: null
    })).rejects.toMatchObject({ code: "KNOCKOUT_MATCH_REQUIRES_BRACKET" });

    await knockout.generate("organizer-1", arena.id, false);
    const final = matches.matches[0];
    if (!final) throw new Error("Final ausente.");
    await expect(matchService.recordScore(
      "organizer-1",
      arena.id,
      final.id,
      1,
      1
    )).rejects.toMatchObject({ code: "DRAW_NOT_ALLOWED" });
  });

  it("rejects bracket generation for a league arena", async () => {
    const arena = await championships.create("organizer-1", {
      name: "Liga ArenaX",
      sport: "Futsal",
      description: null,
      entryType: "TEAM",
      format: "LEAGUE",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowsDraw: true,
      startsAt: null,
      endsAt: null
    });
    await expect(knockout.generate("organizer-1", arena.id)).rejects.toMatchObject({ code: "CHAMPIONSHIP_IS_NOT_KNOCKOUT" });
  });

  it("rejects bracket generation when arena is not draft", async () => {
    const arena = await createArena(4);
    await championships.setStatus("organizer-1", arena.id, "PUBLISHED");
    await expect(knockout.generate("organizer-1", arena.id)).rejects.toMatchObject({ code: "BRACKET_REQUIRES_DRAFT" });
  });

  it("creates third place node when enabled", async () => {
    const arena = await createArena(4);
    const result = await knockout.generate("organizer-1", arena.id, true);
    const maxRound = Math.max(...result.nodes.map((n) => n.roundNumber));
    const thirdNode = result.nodes.find((n) => n.roundNumber === maxRound && n.position === 2);
    expect(thirdNode).toBeDefined();
    expect(thirdNode?.homeEntryId).toBeNull();
    expect(thirdNode?.awayEntryId).toBeNull();
  });

  it("does not create third place node when disabled", async () => {
    const arena = await createArena(4);
    const result = await knockout.generate("organizer-1", arena.id, false);
    const maxRound = Math.max(...result.nodes.map((n) => n.roundNumber));
    const thirdNode = result.nodes.find((n) => n.roundNumber === maxRound && n.position === 2);
    expect(thirdNode).toBeUndefined();
  });

  it("skips third place for 2-player bracket", async () => {
    const arena = await createArena(2);
    const result = await knockout.generate("organizer-1", arena.id, true);
    expect(result.totalRounds).toBe(1);
    expect(result.nodes).toHaveLength(1);
  });

  it("advances loser to third place match", async () => {
    const arena = await createArena(4);
    await knockout.generate("organizer-1", arena.id, true);
    const semi1 = matches.matches[0];
    await matchService.recordScore("organizer-1", arena.id, semi1.id, 2, 0);
    const semi2 = matches.matches[1];
    await matchService.recordScore("organizer-1", arena.id, semi2.id, 1, 3);
    const finalMatch = matches.matches.find((m) => m.roundNumber === 2 && m.id !== semi1.id && m.id !== semi2.id);
    expect(finalMatch).toBeDefined();
    const thirdMatch = matches.matches.find((m) => m.roundNumber === 3);
    expect(thirdMatch).toBeDefined();
    expect(thirdMatch?.homeEntryId).toBe(semi1.awayEntryId);
    expect(thirdMatch?.awayEntryId).toBe(semi2.homeEntryId);
  });

  it("detects the champion after the final", async () => {
    const arena = await createArena(2);
    await knockout.generate("organizer-1", arena.id, false);
    const final = matches.matches[0];
    await matchService.recordScore("organizer-1", arena.id, final.id, 3, 1);
    const championId = await knockout.getChampion(arena.id);
    expect(championId).toBe("entry-1");
  });

  it("returns null champion before final is finished", async () => {
    const arena = await createArena(2);
    await knockout.generate("organizer-1", arena.id, false);
    const championId = await knockout.getChampion(arena.id);
    expect(championId).toBeNull();
  });

  it("handles byes with third place enabled", async () => {
    const arena = await createArena(3);
    const result = await knockout.generate("organizer-1", arena.id, true);
    expect(result.totalRounds).toBe(3);
    expect(result.nodes).toHaveLength(4);
  });
});
