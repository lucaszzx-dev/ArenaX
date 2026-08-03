import { describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";

function buildService() {
  const repository = new InMemoryChampionshipRepository();
  return {
    service: new ChampionshipService(repository),
    repository
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    name: "Copa de Teste",
    sport: "Futebol",
    description: null,
    entryType: "TEAM" as const,
    format: "LEAGUE" as const,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowsDraw: true,
    bestOfSets: 5,
    thirdPlace: false,
    maxYellowCards: 0,
    startsAt: null,
    endsAt: null,
    ...overrides
  };
}

describe("championship sport rules", () => {
  it("keeps maxYellowCards only for football/futsal", async () => {
    const { service, repository } = buildService();

    const football = await service.create("owner-1", input({ maxYellowCards: 3 }));
    const futsal = await service.create("owner-1", input({ sport: "Futsal", maxYellowCards: 2 }));
    const volleyball = await service.create("owner-1", input({ sport: "Vôlei", maxYellowCards: 4 }));
    const basketball = await service.create("owner-1", input({ sport: "Basquete", maxYellowCards: 5 }));

    expect(football.maxYellowCards).toBe(3);
    expect(futsal.maxYellowCards).toBe(2);
    expect(volleyball.maxYellowCards).toBe(0);
    expect(basketball.maxYellowCards).toBe(0);
    expect(repository.championships).toHaveLength(4);
  });

  it("keeps bestOfSets only for volleyball", async () => {
    const { service } = buildService();

    const volleyball = await service.create("owner-1", input({ sport: "Vôlei", bestOfSets: 3 }));
    const football = await service.create("owner-1", input({ bestOfSets: 3 }));
    const futsal = await service.create("owner-1", input({ sport: "Futsal", bestOfSets: 5 }));

    expect(volleyball.bestOfSets).toBe(3);
    expect(football.bestOfSets).toBe(5);
    expect(futsal.bestOfSets).toBe(5);
  });

  it("resets irrelevant rules when the sport changes on update", async () => {
    const { service } = buildService();
    const created = await service.create("owner-1", input({ sport: "Futebol", maxYellowCards: 3, bestOfSets: 3 }));

    const updatedToVolleyball = await service.update("owner-1", created.id, {
      ...input({ sport: "Vôlei", bestOfSets: 3 }),
      maxYellowCards: 2
    });
    expect(updatedToVolleyball.maxYellowCards).toBe(0);
    expect(updatedToVolleyball.bestOfSets).toBe(3);

    const updatedToFutsal = await service.update("owner-1", created.id, {
      ...input({ sport: "Futsal", maxYellowCards: 4 }),
      bestOfSets: 3
    });
    expect(updatedToFutsal.maxYellowCards).toBe(4);
    expect(updatedToFutsal.bestOfSets).toBe(5);
  });

  it("forces no draws and keeps third place for knockout", async () => {
    const { service } = buildService();
    const knockout = await service.create("owner-1", input({ format: "KNOCKOUT", allowsDraw: true, thirdPlace: true }));
    expect(knockout.allowsDraw).toBe(false);
    expect(knockout.thirdPlace).toBe(true);
  });
});
