import { describe, expect, it } from "vitest";

import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";

const validInput: ChampionshipInput = {
  name: "Copa ArenaX",
  sport: "Futebol",
  description: "Campeonato de teste",
  entryType: "TEAM",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowsDraw: true,
  startsAt: new Date("2026-08-01T12:00:00.000Z"),
  endsAt: new Date("2026-09-01T12:00:00.000Z")
};

describe("ChampionshipService", () => {
  it("creates a draft championship owned by the current user", async () => {
    const repository = new InMemoryChampionshipRepository();
    const service = new ChampionshipService(repository);

    const championship = await service.create("organizer-1", validInput);

    expect(championship).toMatchObject({
      organizerId: "organizer-1",
      name: "Copa ArenaX",
      status: "DRAFT"
    });
    expect(championship.slug).toMatch(/^copa-arenax-[a-f0-9]{6}$/);
  });

  it("rejects an end date before the start date", async () => {
    const repository = new InMemoryChampionshipRepository();
    const service = new ChampionshipService(repository);

    await expect(
      service.create("organizer-1", {
        ...validInput,
        endsAt: new Date("2026-07-01T12:00:00.000Z")
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CHAMPIONSHIP_DATES"
    });
  });

  it("does not expose another organizer's championship", async () => {
    const repository = new InMemoryChampionshipRepository();
    const service = new ChampionshipService(repository);
    const championship = await service.create("organizer-1", validInput);

    await expect(
      service.getMine("organizer-2", championship.id)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "CHAMPIONSHIP_NOT_FOUND"
    });
  });

  it("does not expose a draft championship publicly", async () => {
    const repository = new InMemoryChampionshipRepository();
    const service = new ChampionshipService(repository);
    const championship = await service.create("organizer-1", validInput);

    await expect(service.getPublic(championship.slug)).rejects.toMatchObject({
      statusCode: 404,
      code: "CHAMPIONSHIP_NOT_FOUND"
    });
  });
});
