import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import { ChampionshipService } from "../src/championships/championship-service.js";
import type { Env } from "../src/config/env.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";

const authRepository = new InMemoryAuthRepository();
const authService = new AuthService(authRepository, 7);
const championshipRepository = new InMemoryChampionshipRepository();
const championshipService = new ChampionshipService(championshipRepository);
const env: Env = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3333,
  DATABASE_URL: "postgresql://arenax:secret@localhost:5432/arenax",
  FRONTEND_URL: "http://localhost:5173",
  SESSION_COOKIE_NAME: "arenax_session",
  SESSION_TTL_DAYS: 7
};
const app = buildApp({ authService, championshipService, env });

async function createSessionCookie() {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      displayName: "Organizador",
      email: `organizer-${crypto.randomUUID()}@arenax.test`,
      password: "senha-segura"
    }
  });
  const cookie = response.cookies.find(
    (item) => item.name === env.SESSION_COOKIE_NAME
  );

  if (!cookie) {
    throw new Error("Cookie de sessão não encontrado.");
  }

  return `${cookie.name}=${cookie.value}`;
}

const payload = {
  name: "Liga do Bairro",
  sport: "Futebol",
  description: "Primeira edição",
  entryType: "TEAM",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowsDraw: true,
  startsAt: "2026-08-01T12:00:00.000Z",
  endsAt: "2026-09-01T12:00:00.000Z"
};

describe("championship routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires authentication to create a championship", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/championships",
      payload
    });

    expect(response.statusCode).toBe(401);
  });

  it("creates and lists the current organizer's championships", async () => {
    const cookie = await createSessionCookie();
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/championships",
      headers: { cookie },
      payload
    });
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/championships",
      headers: { cookie }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      championship: {
        name: "Liga do Bairro",
        status: "DRAFT"
      }
    });
    expect(
      listResponse.json<{ championships: unknown[] }>().championships
    ).toHaveLength(1);
  });

  it("creates championships per sport with sport-specific rules", async () => {
    const cookie = await createSessionCookie();
    const cases = [
      { sport: "Futebol", maxYellowCards: 3, bestOfSets: 3, expectedYellow: 3, expectedSets: 5 },
      { sport: "Futsal", maxYellowCards: 2, bestOfSets: 5, expectedYellow: 2, expectedSets: 5 },
      { sport: "Vôlei", maxYellowCards: 4, bestOfSets: 3, expectedYellow: 0, expectedSets: 3 },
      { sport: "Basquete", maxYellowCards: 5, bestOfSets: 3, expectedYellow: 0, expectedSets: 5 }
    ];

    for (const testCase of cases) {
      const response = await app.inject({
        method: "POST",
        url: "/api/championships",
        headers: { cookie },
        payload: {
          ...payload,
          name: `Liga ${testCase.sport}`,
          sport: testCase.sport,
          maxYellowCards: testCase.maxYellowCards,
          bestOfSets: testCase.bestOfSets
        }
      });
      expect(response.statusCode).toBe(201);
      const body = response.json<{
        championship: { maxYellowCards: number; bestOfSets: number };
      }>();
      expect(body.championship.maxYellowCards).toBe(testCase.expectedYellow);
      expect(body.championship.bestOfSets).toBe(testCase.expectedSets);
    }
  });

  it("requires authentication to delete a championship", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/championships/${crypto.randomUUID()}`
    });

    expect(response.statusCode).toBe(401);
  });

  it("deletes the current organizer's championship", async () => {
    const cookie = await createSessionCookie();
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/championships",
      headers: { cookie },
      payload
    });
    const id = createResponse.json<{ championship: { id: string } }>().championship.id;

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/championships/${id}`,
      headers: { cookie }
    });

    expect(deleteResponse.statusCode).toBe(204);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/championships",
      headers: { cookie }
    });
    expect(listResponse.json<{ championships: unknown[] }>().championships).toHaveLength(0);
  });

  it("does not delete another user's championship", async () => {
    const ownerCookie = await createSessionCookie();
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/championships",
      headers: { cookie: ownerCookie },
      payload
    });
    const id = createResponse.json<{ championship: { id: string } }>().championship.id;

    const otherCookie = await createSessionCookie();
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/championships/${id}`,
      headers: { cookie: otherCookie }
    });

    expect(deleteResponse.statusCode).toBe(404);
    expect(deleteResponse.json()).toMatchObject({
      error: { code: "CHAMPIONSHIP_NOT_FOUND" }
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/championships",
      headers: { cookie: ownerCookie }
    });
    expect(listResponse.json<{ championships: unknown[] }>().championships).toHaveLength(1);
  });

  it("updates sport rules when the sport changes", async () => {
    const cookie = await createSessionCookie();
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/championships",
      headers: { cookie },
      payload: { ...payload, name: "Troca de esporte", sport: "Futebol", maxYellowCards: 3 }
    });
    const id = createResponse.json<{ championship: { id: string } }>().championship.id;

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/api/championships/${id}`,
      headers: { cookie },
      payload: { ...payload, name: "Troca de esporte", sport: "Vôlei", bestOfSets: 3, maxYellowCards: 2 }
    });
    expect(updateResponse.statusCode).toBe(200);
    const body = updateResponse.json<{
      championship: { maxYellowCards: number; bestOfSets: number };
    }>();
    expect(body.championship.maxYellowCards).toBe(0);
    expect(body.championship.bestOfSets).toBe(3);
  });
});
