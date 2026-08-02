import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { NotificationService } from "../src/notifications/notification-service.js";
import type { Match } from "../src/matches/match-repository.js";
import type { Championship } from "../src/championships/championship-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryNotificationRepository } from "./support/in-memory-notification-repository.js";

function buildMatch(
  championshipId: string,
  overrides: Partial<Match> = {}
): Match {
  return {
    id: "match-1",
    championshipId,
    homeEntryId: "entry-1",
    awayEntryId: "entry-2",
    scheduledAt: new Date("2026-08-10T19:00:00.000Z"),
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    roundNumber: 1,
    generated: false,
    mvpId: null,
    venue: null,
    referee: null,
    operationalNotes: null,
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
    updatedAt: new Date("2026-08-01T12:00:00.000Z"),
    homeEntry: { id: "entry-1", championshipId, displayName: "Azul" },
    awayEntry: { id: "entry-2", championshipId, displayName: "Raio" },
    ...overrides
  };
}

describe("NotificationService", () => {
  let championships: ChampionshipService;
  let repository: InMemoryNotificationRepository;
  let service: NotificationService;
  let arena: Championship;

  beforeEach(async () => {
    championships = new ChampionshipService(
      new InMemoryChampionshipRepository()
    );
    repository = new InMemoryNotificationRepository();
    service = new NotificationService(repository, championships);
    arena = await championships.create("organizer-1", {
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
    });
    repository.entryUsers.set("entry-1", ["user-1"]);
    repository.entryUsers.set("entry-2", ["user-2", "organizer-1"]);
  });

  it("notifies entry users about a recorded result", async () => {
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 3, 1);

    expect(repository.notifications).toHaveLength(2);
    const users = repository.notifications.map((item) => item.userId).sort();
    expect(users).toEqual(["user-1", "user-2"]);
    expect(repository.notifications[0]).toMatchObject({
      type: "MATCH_RESULT",
      title: "Resultado registrado",
      link: `/campeonatos/${arena.slug}/partidas/match-1`
    });
  });

  it("excludes the organizer who recorded the score", async () => {
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 1, 0);

    const organizers = repository.notifications.filter(
      (item) => item.userId === "organizer-1"
    );
    expect(organizers).toHaveLength(0);
  });

  it("does not duplicate notifications for the same event", async () => {
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 2, 2);
    await service.notifyMatchResult("organizer-1", arena, match, 2, 2);

    expect(
      repository.notifications.filter((item) => item.userId === "user-1")
    ).toHaveLength(1);
  });

  it("notifies a schedule change with the new date", async () => {
    const match = buildMatch(arena.id, {
      scheduledAt: new Date("2026-08-20T20:00:00.000Z")
    });
    await service.notifyMatchScheduleChanged(
      "organizer-1",
      arena,
      match,
      match.scheduledAt
    );

    expect(repository.notifications[0]).toMatchObject({
      type: "MATCH_SCHEDULE_CHANGED",
      userId: "user-1"
    });
    expect(repository.notifications[0].message).toContain("20/08/2026");
  });

  it("notifies knockout advancement only for the advanced entry", async () => {
    const match = buildMatch(arena.id);
    await service.notifyKnockoutAdvance(
      "organizer-1",
      arena,
      match,
      "entry-1",
      "NEXT_ROUND"
    );

    const userIds = repository.notifications.map((item) => item.userId);
    expect(userIds).toEqual(["user-1"]);
    expect(repository.notifications[0]).toMatchObject({
      type: "KNOCKOUT_ADVANCE",
      title: "Avanço no mata-mata"
    });
  });

  it("notifies third-place placement for losers", async () => {
    const match = buildMatch(arena.id);
    await service.notifyKnockoutAdvance(
      "organizer-1",
      arena,
      match,
      "entry-2",
      "THIRD_PLACE"
    );

    expect(repository.notifications).toHaveLength(1);
    expect(repository.notifications[0]).toMatchObject({
      userId: "user-2",
      type: "KNOCKOUT_ADVANCE",
      title: "Disputa de terceiro lugar"
    });
  });

  it("notifies linked team members about roster updates", async () => {
    repository.teamMemberUsers.set("team-1", ["user-1", "user-2"]);
    await service.notifySquadUpdated("organizer-1", arena, {
      teamId: "team-1",
      event: "MEMBER_ADDED",
      memberId: "member-1",
      memberDisplayName: "Carlos",
      teamName: "Titãs"
    });

    expect(repository.notifications).toHaveLength(2);
    expect(repository.notifications[0]).toMatchObject({
      type: "SQUAD_UPDATED",
      title: "Elenco atualizado",
      link: `/campeonatos/${arena.slug}/equipes/team-1`
    });
  });

  it("lists notifications for a user with pagination", async () => {
    repository.entryUsers.set("entry-1", ["user-1"]);
    repository.entryUsers.set("entry-2", ["user-1"]);
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 1, 0);
    await service.notifyMatchScheduleChanged(
      "organizer-1",
      arena,
      match,
      new Date("2026-08-21T18:00:00.000Z")
    );

    const first = await service.list("user-1", 1, 1);
    expect(first.notifications).toHaveLength(1);
    expect(first.total).toBe(2);
    expect(first.unread).toBe(2);

    const second = await service.list("user-1", 2, 1);
    expect(second.notifications).toHaveLength(1);
  });

  it("marks a single notification as read", async () => {
    repository.entryUsers.set("entry-1", ["user-1"]);
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 1, 0);

    const target = repository.notifications[0];
    const updated = await service.markRead("user-1", target.id);

    expect(updated?.readAt).not.toBeNull();
    expect(await service.unreadCount("user-1")).toBe(0);
  });

  it("rejects marking another user's notification as read", async () => {
    repository.entryUsers.set("entry-1", ["user-1"]);
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 1, 0);

    await expect(
      service.markRead("user-2", repository.notifications[0].id)
    ).rejects.toMatchObject({ code: "NOTIFICATION_NOT_FOUND" });
  });

  it("marks all notifications as read", async () => {
    repository.entryUsers.set("entry-1", ["user-1"]);
    repository.entryUsers.set("entry-2", ["user-1"]);
    const match = buildMatch(arena.id);
    await service.notifyMatchResult("organizer-1", arena, match, 1, 0);
    await service.notifyMatchResult("organizer-1", arena, match, 0, 0);

    const updated = await service.markAllRead("user-1");
    expect(updated).toBe(2);
    expect(await service.unreadCount("user-1")).toBe(0);
  });

  it("notifies upcoming matches once per match", async () => {
    repository.entryUsers.set("entry-1", ["user-1"]);
    repository.entryUsers.set("entry-2", ["user-1"]);
    repository.upcomingMatches.push({
      matchId: "match-1",
      championshipId: arena.id,
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: new Date("2026-08-10T19:00:00.000Z"),
      homeDisplayName: "Azul",
      awayDisplayName: "Raio",
      championshipName: arena.name,
      championshipSlug: arena.slug
    });

    const now = new Date("2026-08-10T00:00:00.000Z");
    const count = await service.notifyUpcomingMatches(now, 24 * 60 * 60 * 1000);

    expect(count).toBe(1);
    expect(repository.notifications).toHaveLength(1);
    expect(repository.notifications[0]).toMatchObject({
      type: "MATCH_UPCOMING",
      title: "Partida próxima"
    });

    await service.notifyUpcomingMatches(now, 24 * 60 * 60 * 1000);
    expect(repository.notifications).toHaveLength(1);
  });
});
