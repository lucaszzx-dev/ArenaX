import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { MatchPeriodService } from "../src/match-periods/match-period-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchPeriodRepository } from "./support/in-memory-match-period-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

describe("MatchPeriodService", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let periods: InMemoryMatchPeriodRepository;
  let service: MatchPeriodService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    matches = new InMemoryMatchRepository();
    periods = new InMemoryMatchPeriodRepository();
    service = new MatchPeriodService(periods, matches, championships);
  });

  it("saves and updates a basketball quarter", async () => {
    const { championshipId, matchId } = await createMatch("Basquete");

    await service.save("organizer-1", championshipId, matchId, {
      periodNumber: 1,
      homeScore: 20,
      awayScore: 18
    });
    await service.save("organizer-1", championshipId, matchId, {
      periodNumber: 1,
      homeScore: 22,
      awayScore: 18
    });

    expect(await service.listPublic(championshipId, matchId)).toMatchObject([
      { periodNumber: 1, homeScore: 22, awayScore: 18 }
    ]);
  });

  it("rejects a tied volleyball set", async () => {
    const { championshipId, matchId } = await createMatch("Vôlei");

    await expect(service.save("organizer-1", championshipId, matchId, {
      periodNumber: 1,
      homeScore: 24,
      awayScore: 24
    })).rejects.toMatchObject({ code: "VOLLEYBALL_SET_CANNOT_DRAW" });
  });

  it("rejects periods for sports without detailed scores", async () => {
    const { championshipId, matchId } = await createMatch("Futebol");

    await expect(service.save("organizer-1", championshipId, matchId, {
      periodNumber: 1,
      homeScore: 1,
      awayScore: 0
    })).rejects.toMatchObject({ code: "MATCH_PERIODS_NOT_SUPPORTED" });
  });

  async function createMatch(sport: string) {
    const championship = await championships.create("organizer-1", {
      name: `Arena ${sport}`,
      sport,
      description: null,
      entryType: "TEAM",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowsDraw: false,
      startsAt: null,
      endsAt: null
    });
    matches.entries.push(
      { id: "home", championshipId: championship.id, displayName: "Casa" },
      { id: "away", championshipId: championship.id, displayName: "Visitante" }
    );
    const matchService = new MatchService(matches, championships);
    const match = await matchService.create("organizer-1", championship.id, {
      homeEntryId: "home",
      awayEntryId: "away",
      scheduledAt: null
    });
    return { championshipId: championship.id, matchId: match.id };
  }
});
