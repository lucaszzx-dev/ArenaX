import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthService } from "../src/auth/auth-service.js";
import type { Env } from "../src/config/env.js";
import { ChampionshipService } from "../src/championships/championship-service.js";
import { NotificationService } from "../src/notifications/notification-service.js";
import { InMemoryAuthRepository } from "./support/in-memory-auth-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryNotificationRepository } from "./support/in-memory-notification-repository.js";

const authRepository = new InMemoryAuthRepository();
const authService = new AuthService(authRepository, 7);
const notificationRepository = new InMemoryNotificationRepository();
const notificationService = new NotificationService(
  notificationRepository,
  new ChampionshipService(new InMemoryChampionshipRepository())
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
const app = buildApp({ authService, notificationService, env });

async function createSessionCookie() {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      displayName: "Jogador",
      email: `player-${crypto.randomUUID()}@arenax.test`,
      password: "senha-segura"
    }
  });
  const cookie = response.cookies.find(
    (item) => item.name === env.SESSION_COOKIE_NAME
  );
  if (!cookie) throw new Error("Cookie de sessão não encontrado.");
  return `${cookie.name}=${cookie.value}`;
}

describe("notification routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/api/notifications" });
    expect(response.statusCode).toBe(401);
  });

  it("lists, marks read and marks all read for the current user", async () => {
    const cookie = await createSessionCookie();
    const current = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie }
    });
    const userId = current.json<{ user: { id: string } }>().user.id;

    await notificationRepository.createMany([
      {
        userId,
        type: "MATCH_RESULT",
        title: "Resultado registrado",
        message: "Azul venceu Raio por 3 a 1.",
        link: "/campeonatos/liga/partidas/match-1",
        dedupKey: "match:match-1:result:3-1"
      },
      {
        userId,
        type: "KNOCKOUT_ADVANCE",
        title: "Avanço no mata-mata",
        message: "Azul avançou para a próxima fase.",
        link: "/campeonatos/liga/partidas/match-2",
        dedupKey: "match:match-2:advance:entry-1"
      }
    ]);

    const unread = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
      headers: { cookie }
    });
    expect(unread.json()).toEqual({ unread: 2 });

    const list = await app.inject({
      method: "GET",
      url: "/api/notifications?page=1&limit=20",
      headers: { cookie }
    });
    const body = list.json<{ notifications: Array<{ id: string }>; total: number; unread: number }>();
    expect(body.total).toBe(2);
    expect(body.unread).toBe(2);
    expect(body.notifications).toHaveLength(2);

    const markOne = await app.inject({
      method: "PUT",
      url: `/api/notifications/${body.notifications[0].id}/read`,
      headers: { cookie }
    });
    expect(markOne.statusCode).toBe(200);
    expect(markOne.json<{ notification: { readAt: string | null } }>().notification.readAt).not.toBeNull();

    const markAll = await app.inject({
      method: "PUT",
      url: "/api/notifications/read-all",
      headers: { cookie }
    });
    expect(markAll.json()).toEqual({ updated: 1 });

    const after = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
      headers: { cookie }
    });
    expect(after.json()).toEqual({ unread: 0 });
  });

  it("does not allow marking another user's notification as read", async () => {
    const cookieA = await createSessionCookie();
    const cookieB = await createSessionCookie();
    const meA = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookieA }
    });
    const userIdA = meA.json<{ user: { id: string } }>().user.id;

    await notificationRepository.createMany([
      {
        userId: userIdA,
        type: "MATCH_UPCOMING",
        title: "Partida próxima",
        message: "Confronto em breve.",
        link: "/campeonatos/liga/partidas/match-3",
        dedupKey: "match:match-3:upcoming"
      }
    ]);
    const targetId = notificationRepository.notifications[0].id;

    const response = await app.inject({
      method: "PUT",
      url: `/api/notifications/${targetId}/read`,
      headers: { cookie: cookieB }
    });
    expect(response.statusCode).toBe(404);
  });
});
