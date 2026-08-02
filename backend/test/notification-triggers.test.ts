import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { KnockoutService } from "../src/knockout/knockout-service.js";
import { MatchService } from "../src/matches/match-service.js";
import { NotificationService } from "../src/notifications/notification-service.js";
import { ParticipantService } from "../src/participants/participant-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryKnockoutRepository } from "./support/in-memory-knockout-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";
import { InMemoryNotificationRepository } from "./support/in-memory-notification-repository.js";
import { InMemoryParticipantRepository } from "./support/in-memory-participant-repository.js";

const arenaInput = {
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
};

describe("notification triggers from domain services", () => {
  let championships: ChampionshipService;
  let matches: InMemoryMatchRepository;
  let notifications: InMemoryNotificationRepository;
  let notificationService: NotificationService;
  let knockout: KnockoutService;
  let matchService: MatchService;

  beforeEach(async () => {
    championships = new ChampionshipService(
      new InMemoryChampionshipRepository()
    );
    matches = new InMemoryMatchRepository();
    notifications = new InMemoryNotificationRepository();
    notificationService = new NotificationService(
      notifications,
      championships
    );
    knockout = new KnockoutService(
      new InMemoryKnockoutRepository(matches),
      matches,
      championships,
      notificationService
    );
    matchService = new MatchService(
      matches,
      championships,
      undefined,
      knockout,
      notificationService
    );
  });

  it("records a result and notifies users linked to the entries", async () => {
    const arena = await championships.create("organizer-1", arenaInput);
    matches.entries.push(
      { id: "entry-1", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-2", championshipId: arena.id, displayName: "Raio" }
    );
    notifications.entryUsers.set("entry-1", ["user-1"]);
    notifications.entryUsers.set("entry-2", ["user-2"]);
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: new Date("2026-08-10T19:00:00.000Z")
    });

    await matchService.recordScore("organizer-1", arena.id, match.id, 3, 1);

    expect(
      notifications.notifications.filter((item) => item.type === "MATCH_RESULT")
    ).toHaveLength(2);
    expect(notifications.notifications.every((item) =>
      item.userId !== "organizer-1"
    )).toBe(true);
  });

  it("notifies schedule changes through MatchService.updateSchedule", async () => {
    const arena = await championships.create("organizer-1", arenaInput);
    matches.entries.push(
      { id: "entry-1", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-2", championshipId: arena.id, displayName: "Raio" }
    );
    notifications.entryUsers.set("entry-1", ["user-1"]);
    const match = await matchService.create("organizer-1", arena.id, {
      homeEntryId: "entry-1",
      awayEntryId: "entry-2",
      scheduledAt: null
    });

    await matchService.updateSchedule(
      "organizer-1",
      arena.id,
      match.id,
      new Date("2026-08-15T20:00:00.000Z")
    );

    expect(notifications.notifications).toHaveLength(1);
    expect(notifications.notifications[0]).toMatchObject({
      type: "MATCH_SCHEDULE_CHANGED",
      userId: "user-1"
    });
  });

  it("fires knockout advance notifications through recordScore", async () => {
    const arena = await championships.create("organizer-1", {
      ...arenaInput,
      format: "KNOCKOUT"
    });
    matches.entries.push(
      { id: "entry-1", championshipId: arena.id, displayName: "Azul" },
      { id: "entry-2", championshipId: arena.id, displayName: "Raio" },
      { id: "entry-3", championshipId: arena.id, displayName: "Verde" },
      { id: "entry-4", championshipId: arena.id, displayName: "Preto" }
    );
    notifications.entryUsers.set("entry-1", ["user-1"]);
    notifications.entryUsers.set("entry-2", ["user-2"]);
    await knockout.generate("organizer-1", arena.id, false);
    const firstMatch = matches.matches.find(
      (match) => match.roundNumber === 1 && match.homeEntryId === "entry-1"
    );
    if (!firstMatch) throw new Error("Confronto inicial não encontrado.");

    await matchService.recordScore("organizer-1", arena.id, firstMatch.id, 2, 0);

    const advance = notifications.notifications.find(
      (item) => item.type === "KNOCKOUT_ADVANCE" && item.userId === "user-1"
    );
    expect(advance).toBeDefined();
    expect(advance?.message).toContain("avançou");
  });

  it("notifies squad updates through ParticipantService.addTeamMember", async () => {
    const participants = new InMemoryParticipantRepository();
    const participantService = new ParticipantService(
      participants,
      championships,
      notificationService
    );
    const arena = await championships.create("organizer-1", arenaInput);
    const team = await participantService.createTeam(
      "organizer-1",
      arena.id,
      "Titãs",
      null
    );
    notifications.teamMemberUsers.set(team.id, ["user-1", "user-2"]);

    await participantService.addTeamMember(
      "organizer-1",
      arena.id,
      team.id,
      "Carlos",
      7,
      "Goleiro"
    );

    const squad = notifications.notifications.filter(
      (item) => item.type === "SQUAD_UPDATED"
    );
    expect(squad).toHaveLength(2);
    expect(squad[0]).toMatchObject({
      userId: "user-1",
      title: "Elenco atualizado",
      link: `/campeonatos/${arena.slug}/equipes/${team.id}`
    });
  });
});
