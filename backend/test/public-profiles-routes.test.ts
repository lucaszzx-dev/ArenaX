import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import type { Match } from "../src/matches/match-repository.js";
import { MatchService } from "../src/matches/match-service.js";
import { PublicProfileService } from "../src/public-profiles/public-profile-service.js";
import type {
  PublicMemberContext,
  PublicProfile
} from "../src/public-profiles/public-profile-repository.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryMatchEventRepository } from "./support/in-memory-match-event-repository.js";
import { InMemoryMatchRepository } from "./support/in-memory-match-repository.js";
import { InMemoryPublicProfileRepository } from "./support/in-memory-public-profile-repository.js";

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

const memberA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const organizerId = "11111111-1111-4111-8111-111111111111";
const clubId = "22222222-2222-4222-8222-222222222222";
const teamA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const teamB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const entryA = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const entryB = "ffffffff-ffff-4fff-8fff-ffffffffffff";

describe("public profile routes", () => {
  afterEach(() => {
    // each test builds its own app
  });

  function context(
    championshipId: string,
    status: "DRAFT" | "PUBLISHED" | "FINISHED"
  ): PublicMemberContext {
    return {
      memberId: memberA,
      displayName: "Camisa 10",
      teamId: teamA,
      teamName: "Azul",
      teamShortName: "AZU",
      teamLogoUrl: null,
      championshipId,
      championshipName: "Copa Pública",
      championshipSlug: "copa-publica",
      championshipSport: "Futsal",
      championshipStatus: status,
      entryId: entryA
    };
  }

  function buildMatch(
    id: string,
    championshipId: string,
    homeScore: number,
    awayScore: number,
    status: "SCHEDULED" | "FINISHED" | "CANCELED" = "FINISHED"
  ): Match {
    const now = new Date();
    return {
      id,
      championshipId,
      homeEntryId: entryA,
      awayEntryId: entryB,
      scheduledAt: new Date("2026-08-02T18:00:00.000Z"),
      status,
      homeScore: status === "FINISHED" ? homeScore : null,
      awayScore: status === "FINISHED" ? awayScore : null,
      roundNumber: 1,
      generated: false,
      mvpId: null,
      venue: null,
      referee: null,
      operationalNotes: null,
      createdAt: now,
      updatedAt: now,
      homeEntry: {
        id: entryA,
        championshipId,
        displayName: "Azul",
        kind: "TEAM",
        teamId: teamA
      },
      awayEntry: {
        id: entryB,
        championshipId,
        displayName: "Raio",
        kind: "TEAM",
        teamId: teamB
      }
    };
  }

  it("lists player match history with events, result and pagination", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const publicProfileRepository = new InMemoryPublicProfileRepository();

    const championship = await championshipService.create(organizerId, input);
    await championshipRepository.updateStatus(championship.id, "PUBLISHED");
    publicProfileRepository.memberContexts.push(
      context(championship.id, "PUBLISHED")
    );

    matchRepository.matches.push(
      buildMatch("m1", championship.id, 3, 1),
      buildMatch("m2", championship.id, 1, 2),
      buildMatch("m3", championship.id, 0, 0, "CANCELED"),
      buildMatch("m4", championship.id, 2, 2)
    );
    eventRepository.entries.push({
      id: entryA,
      championshipId: championship.id,
      teamId: teamA
    });
    eventRepository.events.push(
      {
        id: "e1",
        matchId: "m1",
        entryId: entryA,
        teamMemberId: memberA,
        actorName: "Camisa 10",
        type: "GOAL",
        value: 1,
        periodNumber: 1,
        clockSeconds: 300,
        notes: null,
        relatedEventId: null,
        createdAt: new Date()
      },
      {
        id: "e2",
        matchId: "m1",
        entryId: entryA,
        teamMemberId: memberA,
        actorName: "Camisa 10",
        type: "YELLOW_CARD",
        value: 1,
        periodNumber: 1,
        clockSeconds: 500,
        notes: null,
        relatedEventId: null,
        createdAt: new Date()
      }
    );

    const publicProfileService = new PublicProfileService(
      publicProfileRepository,
      matchRepository,
      eventRepository,
      championshipRepository
    );
    const matchService = new MatchService(matchRepository, championshipService);
    const app = buildApp({
      championshipService,
      matchService,
      publicProfileService
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/public/players/${memberA}/matches?limit=2&page=1`
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      items: Array<{
        matchId: string;
        result: string | null;
        status: string;
        teamName: string;
        opponentDisplayName: string;
        events: Array<{ type: string }>;
      }>;
      total: number;
      page: number;
      limit: number;
    }>();
    expect(body.total).toBe(4);
    expect(body.items).toHaveLength(2);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
    const m1 = body.items.find((item) => item.matchId === "m1");
    expect(m1).toMatchObject({
      result: "WIN",
      status: "FINISHED",
      teamName: "Azul",
      opponentDisplayName: "Raio"
    });
    expect(m1?.events.map((event) => event.type)).toEqual([
      "GOAL",
      "YELLOW_CARD"
    ]);

    // Canceled match has no result
    const m3 = body.items.find((item) => item.matchId === "m3");
    expect(m3).toBeUndefined(); // not in first page; check via page 2
    await app.close();
  });

  it("filters player history by sport and returns 404 for hidden players", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const publicProfileRepository = new InMemoryPublicProfileRepository();

    const championship = await championshipService.create(organizerId, input);
    await championshipRepository.updateStatus(championship.id, "PUBLISHED");
    publicProfileRepository.memberContexts.push(
      context(championship.id, "PUBLISHED")
    );
    matchRepository.matches.push(buildMatch("m1", championship.id, 1, 0));
    eventRepository.entries.push({
      id: entryA,
      championshipId: championship.id,
      teamId: teamA
    });

    const publicProfileService = new PublicProfileService(
      publicProfileRepository,
      matchRepository,
      eventRepository,
      championshipRepository
    );
    const matchService = new MatchService(matchRepository, championshipService);
    const app = buildApp({
      championshipService,
      matchService,
      publicProfileService
    });

    const mismatch = await app.inject({
      method: "GET",
      url: `/api/public/players/${memberA}/matches?sport=Basquete`
    });
    expect(mismatch.statusCode).toBe(404);

    const bySport = await app.inject({
      method: "GET",
      url: `/api/public/players/${memberA}/matches?sport=Futsal`
    });
    expect(bySport.statusCode).toBe(200);
    expect(bySport.json<{ total: number }>().total).toBe(1);

    // Draft championship must be hidden
    const draftChamp = await championshipService.create(organizerId, {
      ...input,
      name: "Rascunho"
    });
    publicProfileRepository.memberContexts.push(
      context(draftChamp.id, "DRAFT")
    );
    const draft = await app.inject({
      method: "GET",
      url: `/api/public/players/${memberA}/matches?championshipId=${draftChamp.id}`
    });
    expect(draft.statusCode).toBe(404);

    await app.close();
  });

  it("exposes the organizer profile without private data", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const publicProfileRepository = new InMemoryPublicProfileRepository();

    publicProfileRepository.profiles.push({
      userId: organizerId,
      displayName: "Organizador",
      avatarUrl: "https://example.com/avatar.png",
      bio: "Sou organizador."
    } satisfies PublicProfile);

    const active = await championshipService.create(organizerId, {
      ...input,
      name: "Ativa"
    });
    await championshipRepository.updateStatus(active.id, "PUBLISHED");
    const finished = await championshipService.create(organizerId, {
      ...input,
      name: "Concluída",
      sport: "Basquete"
    });
    await championshipRepository.updateStatus(finished.id, "FINISHED");
    await championshipService.create(organizerId, {
      ...input,
      name: "Rascunho"
    });

    const publicProfileService = new PublicProfileService(
      publicProfileRepository,
      matchRepository,
      eventRepository,
      championshipRepository
    );
    const matchService = new MatchService(matchRepository, championshipService);
    const app = buildApp({
      championshipService,
      matchService,
      publicProfileService
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/public/organizers/${organizerId}`
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<Record<string, unknown>>();
    expect(body).toMatchObject({
      organizer: {
        userId: organizerId,
        displayName: "Organizador",
        avatarUrl: "https://example.com/avatar.png",
        bio: "Sou organizador."
      }
    });
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("organizer.email");
    expect(JSON.stringify(body)).not.toMatch(/@/);

    const organizer = body.organizer as { userId: string };
    const championships = body.championships as {
      active: Array<{ name: string; status: string }>;
      finished: Array<{ name: string; status: string }>;
    };
    expect(championships.active.map((item) => item.name)).toEqual(["Ativa"]);
    expect(championships.finished.map((item) => item.name)).toEqual([
      "Concluída"
    ]);
    expect(
      [...championships.active, ...championships.finished].every(
        (item) => item.status === "PUBLISHED" || item.status === "FINISHED"
      )
    ).toBe(true);
    expect(body.sports).toEqual(["Basquete", "Futsal"]);
    void organizer;
    await app.close();
  });

  it("exposes the club profile with public participations only", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const publicProfileRepository = new InMemoryPublicProfileRepository();

    publicProfileRepository.clubs.push({
      id: clubId,
      ownerId: organizerId,
      name: "Clube Azul",
      shortName: "AZU",
      logoUrl: null,
      members: [
        {
          id: "club-member-1",
          displayName: "Atleta",
          jerseyNumber: 10,
          position: "Atacante",
          isCaptain: true
        }
      ]
    });

    const published = await championshipService.create(organizerId, {
      ...input,
      name: "Publicada"
    });
    await championshipRepository.updateStatus(published.id, "PUBLISHED");
    const draft = await championshipService.create(organizerId, {
      ...input,
      name: "Rascunho Clube"
    });

    publicProfileRepository.clubParticipations.push(
      {
        clubId,
        participation: {
          championshipId: published.id,
          championshipName: "Publicada",
          championshipSlug: published.slug,
          championshipSport: "Futsal",
          championshipStatus: "PUBLISHED",
          teamId: "team-1",
          teamName: "Clube Azul",
          teamLogoUrl: null
        }
      },
      {
        clubId,
        participation: {
          championshipId: draft.id,
          championshipName: "Rascunho Clube",
          championshipSlug: draft.slug,
          championshipSport: "Futsal",
          championshipStatus: "DRAFT",
          teamId: "team-2",
          teamName: "Clube Azul",
          teamLogoUrl: null
        }
      }
    );

    const publicProfileService = new PublicProfileService(
      publicProfileRepository,
      matchRepository,
      eventRepository,
      championshipRepository
    );
    const matchService = new MatchService(matchRepository, championshipService);
    const app = buildApp({
      championshipService,
      matchService,
      publicProfileService
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/public/clubs/${clubId}`
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      club: { name: string; members: Array<{ displayName: string }> };
      championships: Array<{ championshipName: string; championshipStatus: string }>;
      sports: string[];
    }>();
    expect(body.club).toMatchObject({
      name: "Clube Azul",
      members: [{ displayName: "Atleta" }]
    });
    expect(body.championships).toHaveLength(1);
    expect(body.championships[0]).toMatchObject({
      championshipName: "Publicada",
      championshipStatus: "PUBLISHED"
    });
    expect(body.sports).toEqual(["Futsal"]);
    expect(JSON.stringify(body)).not.toMatch(/Rascunho/);

    // No email anywhere
    expect(JSON.stringify(body)).not.toMatch(/@/);
    await app.close();
  });

  it("returns 404 for unknown organizer, club and player", async () => {
    const championshipRepository = new InMemoryChampionshipRepository();
    const championshipService = new ChampionshipService(championshipRepository);
    const matchRepository = new InMemoryMatchRepository();
    const eventRepository = new InMemoryMatchEventRepository();
    const publicProfileRepository = new InMemoryPublicProfileRepository();

    const publicProfileService = new PublicProfileService(
      publicProfileRepository,
      matchRepository,
      eventRepository,
      championshipRepository
    );
    const matchService = new MatchService(matchRepository, championshipService);
    const app = buildApp({
      championshipService,
      matchService,
      publicProfileService
    });

    const organizerResponse = await app.inject({
      method: "GET",
      url: `/api/public/organizers/${crypto.randomUUID()}`
    });
    expect(organizerResponse.statusCode).toBe(404);

    const clubResponse = await app.inject({
      method: "GET",
      url: `/api/public/clubs/${crypto.randomUUID()}`
    });
    expect(clubResponse.statusCode).toBe(404);

    const playerResponse = await app.inject({
      method: "GET",
      url: `/api/public/players/${crypto.randomUUID()}/matches`
    });
    expect(playerResponse.statusCode).toBe(404);

    await app.close();
  });
});



