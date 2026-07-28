import { beforeEach, describe, expect, it } from "vitest";

import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
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

describe("MatchService", () => {
  let championships: ChampionshipService;
  let repository: InMemoryMatchRepository;
  let service: MatchService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    repository = new InMemoryMatchRepository();
    service = new MatchService(repository, championships);
  });

  it("creates a scheduled match between entries from the arena", async () => {
    const arena = await championships.create("organizer-1", arenaInput);
    repository.entries.push(
      { id: "entry-1", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-2", championshipId: arena.id, displayName: "Raio" }
    );

    const match = await service.create("organizer-1", arena.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: null
    });

    expect(match).toMatchObject({
      status: "SCHEDULED",
      homeScore: null,
      awayScore: null
    });
  });

  it("rejects a participant facing itself", async () => {
    const arena = await championships.create("organizer-1", arenaInput);

    await expect(service.create("organizer-1", arena.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-1",
      scheduledAt: null
    })).rejects.toMatchObject({ code: "MATCH_REQUIRES_DISTINCT_ENTRIES" });
  });

  it("rejects an entry from another arena", async () => {
    const arena = await championships.create("organizer-1", arenaInput);
    const other = await championships.create("organizer-1", arenaInput);
    repository.entries.push(
      { id: "entry-1", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-2", championshipId: other.id, displayName: "Raio" }
    );

    await expect(service.create("organizer-1", arena.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: null
    })).rejects.toMatchObject({ code: "ENTRY_NOT_IN_CHAMPIONSHIP" });
  });

  it("does not let another organizer list the matches", async () => {
    const arena = await championships.create("organizer-1", arenaInput);
    await expect(service.list("organizer-2", arena.id)).rejects.toMatchObject({
      code: "CHAMPIONSHIP_NOT_FOUND"
    });
  });
});
