import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import { ChampionshipService } from "../src/championships/championship-service.js";
import type { Env } from "../src/config/env.js";
import { ClubService } from "../src/clubs/club-service.js";
import { KnockoutService } from "../src/knockout/knockout-service.js";
import { MatchEventService } from "../src/match-events/match-event-service.js";
import { StatisticsService } from "../src/match-events/statistics-service.js";
import { MatchPeriodService } from "../src/match-periods/match-period-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { ParticipantService } from "../src/participants/participant-service.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryClubRepository } from "./support/in-memory-club-repository.js";
import { InMemoryKnockoutRepository } from "./support/in-memory-knockout-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchPeriodRepository } from "./support/in-memory-match-period-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";
import { InMemoryParticipantRepository } from "./support/in-memory-participant-repository.js";

const authService = new AuthService(new InMemoryAuthRepository(), 7);
const championshipService = new ChampionshipService(
  new InMemoryChampionshipRepository()
);
const matchRepository = new InMemoryMatchRepository();
const matchService = new MatchService(matchRepository, championshipService);
const matchEventService = new MatchEventService(
  new InMemoryMatchEventRepository(),
  matchRepository,
  championshipService
);
const statisticsService = new StatisticsService(
  new InMemoryMatchEventRepository(),
  matchRepository,
  championshipService
);
const matchPeriodService = new MatchPeriodService(
  new InMemoryMatchPeriodRepository(),
  matchRepository,
  championshipService
);
const knockoutService = new KnockoutService(
  new InMemoryKnockoutRepository(matchRepository),
  matchRepository,
  championshipService
);
const participantService = new ParticipantService(
  new InMemoryParticipantRepository(),
  championshipService
);
const clubService = new ClubService(
  new InMemoryClubRepository(),
  championshipService
);
const env: Env = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3333,
  DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_COOKIE_NAME: "arenax_session",
  SESSION_TTL_DAYS: 7
};
const app = buildApp({
  authService,
  championshipService,
  matchService,
  matchEventService,
  statisticsService,
  matchPeriodService,
  knockoutService,
  participantService,
  clubService,
  env
});

async function createSessionCookie(displayName: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      displayName,
      email: `${displayName.toLowerCase()}-${crypto.randomUUID()}@arenax.test`,
      password: "senha-segura"
    }
  });
  const cookie = response.cookies.find(
    (item) => item.name === env.SESSION_COOKIE_NAME
  );
  if (!cookie) throw new Error("Cookie de sessão não encontrado.");
  return `${cookie.name}=${cookie.value}`;
}

describe("admin routes block cross-organizer access", () => {
  let ownerCookie: string;
  let attackerCookie: string;
  let championshipId: string;
  let matchId: string;

  beforeAll(async () => {
    await app.ready();
    ownerCookie = await createSessionCookie("Dona");
    attackerCookie = await createSessionCookie("Intrusa");
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: ownerCookie }
    });
    const ownerId = me.json<{ user: { id: string } }>().user.id;
    const created = await championshipService.create(ownerId, {
      name: "Copa Privada",
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
    championshipId = created.id;
    const homeEntryId = crypto.randomUUID();
    const awayEntryId = crypto.randomUUID();
    matchRepository.entries.push(
      { id: homeEntryId, championshipId, displayName: "Casa" },
      { id: awayEntryId, championshipId, displayName: "Fora" }
    );
    const match = await matchService.create(ownerId, championshipId, {
      homeEntryId,
      awayEntryId,
      scheduledAt: null
    });
    matchId = match.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["GET", "/api/championships/{id}"],
    ["GET", "/api/championships/{id}/matches"],
    ["GET", "/api/championships/{id}/matches/{matchId}/events"],
    ["GET", "/api/championships/{id}/matches/{matchId}/operations"],
    ["GET", "/api/championships/{id}/participants"],
    ["GET", "/api/championships/{id}/bracket"],
    ["GET", "/api/championships/{id}/bracket/champion"],
    ["GET", "/api/championships/{id}/statistics"],
    ["GET", "/api/championships/{id}/statistics/standings"],
    ["GET", "/api/championships/{id}/statistics/head-to-head/{matchId}/{matchId}"]
  ])("blocks %s %s", async (method, url) => {
    const response = await app.inject({
      method,
      url: url
        .replace("{id}", championshipId)
        .replaceAll("{matchId}", matchId),
      headers: { cookie: attackerCookie }
    });
    expect(response.statusCode).toBe(404);
  });

  it("allows the owner to read their own statistics", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/championships/${championshipId}/statistics`,
      headers: { cookie: ownerCookie }
    });
    expect(response.statusCode).toBe(200);
  });

  it("blocks writes from another organizer", async () => {
    const writeCases = [
      {
        method: "POST",
        url: `/api/championships/${championshipId}/matches`,
        payload: {
          homeEntryId: crypto.randomUUID(),
          awayEntryId: crypto.randomUUID(),
          scheduledAt: null
        }
      },
      {
        method: "POST",
        url: `/api/championships/${championshipId}/matches/${matchId}/events`,
        payload: { entryId: crypto.randomUUID(), type: "GOAL" }
      },
      {
        method: "PUT",
        url: `/api/championships/${championshipId}/matches/${matchId}/periods`,
        payload: { periodNumber: 1, homeScore: 1, awayScore: 0 }
      },
      {
        method: "POST",
        url: `/api/championships/${championshipId}/participants/teams`,
        payload: { name: "Time Invasor", shortName: "INV", logoUrl: null }
      }
    ];
    for (const testCase of writeCases) {
      const response = await app.inject({
        method: testCase.method,
        url: testCase.url,
        headers: { cookie: attackerCookie },
        payload: testCase.payload
      });
      expect(response.statusCode).toBe(404);
    }
  });
});