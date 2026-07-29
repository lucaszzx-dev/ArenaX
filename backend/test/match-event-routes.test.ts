import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import { ChampionshipService } from "../src/championships/championship-service.js";
import type { Env } from "../src/config/env.js";
import { MatchEventService } from "../src/match-events/match-event-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";

const authService = new AuthService(new InMemoryAuthRepository(), 7);
const championshipService = new ChampionshipService(
  new InMemoryChampionshipRepository()
);
const matchRepository = new InMemoryMatchRepository();
const matchService = new MatchService(matchRepository, championshipService);
const eventRepository = new InMemoryMatchEventRepository();
const matchEventService = new MatchEventService(
  eventRepository,
  matchRepository,
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
const app = buildApp({ authService, matchEventService, env });
const homeEntryId = "11111111-1111-4111-8111-111111111111";
const awayEntryId = "22222222-2222-4222-8222-222222222222";

describe("match event routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires authentication to register an event", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/championships/${crypto.randomUUID()}/matches/${crypto.randomUUID()}/events`,
      payload: {
        entryId: crypto.randomUUID(),
        type: "GOAL"
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("registers an unattributed goal for the organizer", async () => {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        displayName: "Organizador",
        email: `events-${crypto.randomUUID()}@arenax.test`,
        password: "senha-segura"
      }
    });
    const userId = registerResponse.json<{ user: { id: string } }>().user.id;
    const cookie = registerResponse.cookies.find(
      (item) => item.name === env.SESSION_COOKIE_NAME
    );
    if (!cookie) throw new Error("Cookie de sessão não encontrado.");

    const arena = await championshipService.create(userId, {
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
    matchRepository.entries.push(
      { id: homeEntryId, championshipId: arena.id, displayName: "Azul" },
      { id: awayEntryId, championshipId: arena.id, displayName: "Raio" }
    );
    eventRepository.entries.push({
      id: homeEntryId,
      championshipId: arena.id,
      teamId: "team-home"
    });
    const match = await matchService.create(userId, arena.id, {
      homeEntryId,
      awayEntryId,
      scheduledAt: null
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/championships/${arena.id}/matches/${match.id}/events`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        entryId: homeEntryId,
        teamMemberId: null,
        type: "GOAL",
        periodNumber: 1,
        clockSeconds: 300,
        notes: null
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      event: {
        entryId: homeEntryId,
        teamMemberId: null,
        actorName: null,
        type: "GOAL",
        value: 1
      }
    });
  });
});
