import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { ClubService } from "../src/clubs/club-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryClubRepository } from "./support/in-memory-club-repository.js";

describe("ClubService", () => {
  let championships: ChampionshipService;
  let repository: InMemoryClubRepository;
  let service: ClubService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    repository = new InMemoryClubRepository();
    service = new ClubService(repository, championships);
  });

  it("keeps clubs private to their owner", async () => {
    const club = await service.create("owner-1", {
      name: "Arena Azul",
      shortName: "AA",
      logoUrl: null
    });

    expect(await service.list("owner-1")).toHaveLength(1);
    expect(await service.list("owner-2")).toHaveLength(0);
    await expect(
      service.update("owner-2", club.id, {
        name: "Clube invadido",
        shortName: null,
        logoUrl: null
      })
    ).rejects.toMatchObject({ code: "CLUB_NOT_FOUND" });
  });

  it("copies the current roster when importing into a team arena", async () => {
    const arena = await championships.create("owner-1", {
      name: "Copa de Futsal",
      sport: "Futsal",
      description: null,
      entryType: "TEAM",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowsDraw: true,
      startsAt: null,
      endsAt: null
    });
    const club = await service.create("owner-1", {
      name: "Arena Azul",
      shortName: "AA",
      logoUrl: null
    });
    await service.addMember("owner-1", club.id, {
      displayName: "Lucas",
      jerseyNumber: 10,
      position: "Ala"
    });

    await service.importIntoChampionship("owner-1", club.id, arena.id);
    await service.addMember("owner-1", club.id, {
      displayName: "Ana",
      jerseyNumber: 7,
      position: "Pivô"
    });

    expect(repository.imports[0]?.club.members).toHaveLength(1);
    expect(repository.imports[0]?.club.members[0]?.displayName).toBe("Lucas");
  });

  it("rejects duplicate imports and individual arenas", async () => {
    const teamArena = await championships.create("owner-1", {
      name: "Copa de Futsal",
      sport: "Futsal",
      description: null,
      entryType: "TEAM",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowsDraw: true,
      startsAt: null,
      endsAt: null
    });
    const individualArena = await championships.create("owner-1", {
      name: "Xadrez",
      sport: "Xadrez",
      description: null,
      entryType: "INDIVIDUAL",
      winPoints: 1,
      drawPoints: 0,
      lossPoints: 0,
      allowsDraw: false,
      startsAt: null,
      endsAt: null
    });
    const club = await service.create("owner-1", {
      name: "Arena Azul",
      shortName: null,
      logoUrl: null
    });

    await service.importIntoChampionship("owner-1", club.id, teamArena.id);
    await expect(
      service.importIntoChampionship("owner-1", club.id, teamArena.id)
    ).rejects.toMatchObject({ code: "CLUB_ALREADY_IMPORTED" });
    await expect(
      service.importIntoChampionship("owner-1", club.id, individualArena.id)
    ).rejects.toMatchObject({ code: "INVALID_ENTRY_TYPE" });
  });
});
