import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import type { Match } from "../src/matches/match-repository.js";
import { MatchEventService } from "../src/match-events/match-event-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { StatisticsService } from "../src/match-events/statistics-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

const input: ChampionshipInput = {
  name: "Copa Pública",
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

describe("public statistics routes", () => {
  afterEach(async () => {
    // no shared apps here; each test builds its own
  });

  it("exposes statistics, standings, streaks, highlights and rankings without auth", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const matchEventService = new MatchEventService(
      eventRepository,
      matchRepository,
      championshipService
    );
    const statisticsService = new StatisticsService(
      eventRepository,
      matchRepository,
      championshipService
    );
    const matchService = new MatchService(matchRepository, championshipService);

    const championship = await championshipService.create("organizer-1", input);
    await championshipRepository.updateStatus(championship.id, "PUBLISHED");
    matchRepository.entries.push(
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", championshipId: championship.id, displayName: "Azul", teamId: "team-a" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", championshipId: championship.id, displayName: "Raio", teamId: "team-b" }
    );
    eventRepository.entries.push(
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", championshipId: championship.id, teamId: "team-a" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", championshipId: championship.id, teamId: "team-b" }
    );
    const now = new Date();
    const match: Match = {
      id: "m1",
      championshipId: championship.id,
      homeEntryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      awayEntryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      scheduledAt: null,
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
      roundNumber: null,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry: matchRepository.entries[0]!,
      awayEntry: matchRepository.entries[1]!
    };
    matchRepository.matches.push(match);
    eventRepository.events.push({
      id: crypto.randomUUID(),
      matchId: "m1",
      entryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      teamMemberId: "member-a",
      actorName: "Artilheiro",
      type: "GOAL",
      value: 1,
      periodNumber: 1,
      clockSeconds: null,
      notes: null,
      relatedEventId: null,
      createdAt: new Date()
    });

    const app = buildApp({
      championshipService,
      matchService,
      matchEventService,
      statisticsService
    });

    const statisticsResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/statistics?limit=10`
    });
    expect(statisticsResponse.statusCode).toBe(200);
    const statisticsBody = statisticsResponse.json<{
      items: Array<{ actorName: string }>;
      total: number;
    }>();
    expect(statisticsBody.items[0]?.actorName).toBe("Artilheiro");
    expect(statisticsBody.total).toBe(1);

    const standingsResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/standings`
    });
    expect(standingsResponse.statusCode).toBe(200);
    const standingsBody = standingsResponse.json<{
      items: Array<{ entryId: string; points: number }>;
    }>();
    expect(standingsBody.items[0]).toMatchObject({ entryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", points: 3 });

    const streaksResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/streaks`
    });
    expect(streaksResponse.statusCode).toBe(200);
    const streaksBody = streaksResponse.json<{
      items: Array<{ entryId: string; currentStreak: number }>;
    }>();
    const azulStreak = streaksBody.items.find((item) => item.entryId === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(azulStreak?.currentStreak).toBe(1);

    const headToHeadResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/head-to-head/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
    });
    expect(headToHeadResponse.statusCode).toBe(200);
    const h2hBody = headToHeadResponse.json<{ items: Array<{ entryId: string; wins: number }> }>();
    expect(h2hBody.items).toHaveLength(2);
    expect(h2hBody.items.find((row) => row.entryId === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")?.wins).toBe(1);

    const highlightsResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/highlights`
    });
    expect(highlightsResponse.statusCode).toBe(200);
    const highlightsBody = highlightsResponse.json<{
      items: Array<{ category: string }>;
    }>();
    expect(highlightsBody.items.some((h) => h.category === "top_scorer")).toBe(true);

    const rankingResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}/rankings/scorer`
    });
    expect(rankingResponse.statusCode).toBe(200);
    const rankingBody = rankingResponse.json<{ items: Array<{ actorName: string }> }>();
    expect(rankingBody.items[0]?.actorName).toBe("Artilheiro");

    await app.close();
  });

  it("keeps statisticsPublic and playerStats available on the overview routes", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const matchEventService = new MatchEventService(
      eventRepository,
      matchRepository,
      championshipService
    );

    const championship = await championshipService.create("organizer-1", input);
    await championshipRepository.updateStatus(championship.id, "PUBLISHED");
    matchRepository.entries.push(
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", championshipId: championship.id, displayName: "Azul" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", championshipId: championship.id, displayName: "Raio" }
    );
    const now = new Date();
    matchRepository.matches.push({
      id: "m1",
      championshipId: championship.id,
      homeEntryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      awayEntryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      scheduledAt: null,
      status: "FINISHED",
      homeScore: 1,
      awayScore: 0,
      roundNumber: null,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry: matchRepository.entries[0]!,
      awayEntry: matchRepository.entries[1]!
    });

    const matchService = new MatchService(matchRepository, championshipService);
    const app = buildApp({ championshipService, matchService, matchEventService });

    const overviewResponse = await app.inject({
      method: "GET",
      url: `/api/public/championships/${championship.slug}`
    });
    expect(overviewResponse.statusCode).toBe(200);
    const overview = overviewResponse.json<{ statistics: unknown[]; standings: unknown[] }>();
    expect(Array.isArray(overview.statistics)).toBe(true);
    expect(Array.isArray(overview.standings)).toBe(true);

    await app.close();
  });
});


