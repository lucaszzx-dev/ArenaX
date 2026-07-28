import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

const apps: ReturnType<typeof buildApp>[] = [];
const input: ChampionshipInput = {
  name: "Copa Pública",
  sport: "Futsal",
  description: "Arena aberta para visitantes",
  entryType: "INDIVIDUAL",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowsDraw: true,
  startsAt: null,
  endsAt: null
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("public championship routes", () => {
  it("returns an arena overview without authentication", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const matchService = new MatchService(matchRepository, championshipService);
    const championship = await championshipService.create("organizer-1", input);
    await championshipRepository.updateStatus(championship.id, "PUBLISHED");
    matchRepository.entries.push({
      id: "entry-1",
      championshipId: championship.id,
      displayName: "Lucas"
    }, {
      id: "entry-2",
      championshipId: championship.id,
      displayName: "Rafael"
    });
    const match = await matchService.create("organizer-1", championship.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: null
    });
    const app = buildApp({ championshipService, matchService });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}`
    });
    const body = response.json<{
      championship: Record<string, unknown>;
      entries: Array<{ displayName: string }>;
      standings: Array<{ displayName: string; position: number }>;
    }>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      championship: {
        name: "Copa Pública",
        slug: championship.slug
      },
      entries: [
        { displayName: "Lucas" },
        { displayName: "Rafael" }
      ],
      standings: [
        { displayName: "Lucas", position: 1 },
        { displayName: "Rafael", position: 2 }
      ]
    });
    expect(body.championship).not.toHaveProperty("organizerId");

    const matchResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/matches/${match.id}`
    });
    expect(matchResponse.statusCode).toBe(200);
    expect(matchResponse.json<{ match: { id: string } }>().match.id).toBe(
      match.id
    );
  });
});
