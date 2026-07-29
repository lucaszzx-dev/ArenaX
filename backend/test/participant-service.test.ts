import { beforeEach, describe, expect, it } from "vitest";

import {
  ChampionshipService,
  type ChampionshipInput
} from "../src/championships/championship-service.js";
import { ParticipantService } from "../src/participants/participant-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryParticipantRepository } from "./support/in-memory-participant-repository.js";

const baseInput: ChampionshipInput = {
  name: "Copa ArenaX",
  sport: "Futsal",
  description: null,
  entryType: "INDIVIDUAL",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowsDraw: true,
  startsAt: null,
  endsAt: null
};

describe("ParticipantService", () => {
  let championships: ChampionshipService;
  let repository: InMemoryParticipantRepository;
  let service: ParticipantService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    repository = new InMemoryParticipantRepository();
    service = new ParticipantService(repository, championships);
  });

  it("adds a manual individual without requiring an ArenaX account", async () => {
    const arena = await championships.create("organizer-1", baseInput);
    const participant = await service.createIndividual(
      "organizer-1",
      arena.id,
      "Ana Silva"
    );

    expect(participant).toMatchObject({ displayName: "Ana Silva", userId: null });
  });

  it("rejects an individual in a team arena", async () => {
    const arena = await championships.create("organizer-1", {
      ...baseInput,
      entryType: "TEAM"
    });

    await expect(
      service.createIndividual("organizer-1", arena.id, "Ana Silva")
    ).rejects.toMatchObject({ code: "INVALID_ENTRY_TYPE" });
  });

  it("creates a team and adds members", async () => {
    const arena = await championships.create("organizer-1", {
      ...baseInput,
      entryType: "TEAM"
    });
    const team = await service.createTeam(
      "organizer-1",
      arena.id,
      "Raios Azuis",
      "RAI"
    );
    const member = await service.addTeamMember(
      "organizer-1",
      arena.id,
      team.id,
      "Lucas"
    );

    expect(member.displayName).toBe("Lucas");
    expect(repository.teams[0]?.members).toHaveLength(1);
  });

  it("updates team identity and assigns one captain", async () => {
    const arena = await championships.create("organizer-1", {
      ...baseInput,
      entryType: "TEAM"
    });
    const team = await service.createTeam(
      "organizer-1",
      arena.id,
      "Raios Azuis",
      "RAI"
    );
    const member = await service.addTeamMember(
      "organizer-1",
      arena.id,
      team.id,
      "Lucas"
    );

    const updated = await service.updateTeam("organizer-1", arena.id, team.id, {
      name: "Raios do Norte",
      shortName: "RDN",
      logoUrl: "https://example.com/escudo.png"
    });
    const withCaptain = await service.setCaptain(
      "organizer-1",
      arena.id,
      team.id,
      member.id
    );

    expect(updated).toMatchObject({
      name: "Raios do Norte",
      logoUrl: "https://example.com/escudo.png"
    });
    expect(withCaptain.members[0]).toMatchObject({
      displayName: "Lucas",
      isCaptain: true
    });
    await expect(
      service.updateTeam("intruder", arena.id, team.id, {
        name: "Invasão",
        shortName: null,
        logoUrl: null
      })
    ).rejects.toMatchObject({ code: "CHAMPIONSHIP_NOT_FOUND" });
  });

  it("blocks duplicate names ignoring letter case", async () => {
    const arena = await championships.create("organizer-1", baseInput);
    await service.createIndividual("organizer-1", arena.id, "Ana Silva");

    await expect(
      service.createIndividual("organizer-1", arena.id, "ana silva")
    ).rejects.toMatchObject({ code: "PARTICIPANT_NAME_IN_USE" });
  });
});
