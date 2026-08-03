import { beforeEach, describe, expect, it } from "vitest";

import { ChampionshipService } from "../src/championships/championship-service.js";
import { ClubService } from "../src/clubs/club-service.js";
import { InMemoryChampionshipRepository } from "./support/in-memory-championship-repository.js";
import { InMemoryClubRepository } from "./support/in-memory-club-repository.js";

describe("ClubService features", () => {
  let championships: ChampionshipService;
  let repository: InMemoryClubRepository;
  let service: ClubService;

  beforeEach(() => {
    championships = new ChampionshipService(new InMemoryChampionshipRepository());
    repository = new InMemoryClubRepository();
    service = new ClubService(repository, championships);
  });

  async function createTeamArena() {
    return championships.create("owner-1", {
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
  }

  async function createClub() {
    return service.create("owner-1", {
      name: "Arena Azul",
      shortName: "AA",
      logoUrl: null
    });
  }

  describe("member updates", () => {
    it("updates an existing club member", async () => {
      const club = await createClub();
      const member = await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });

      const updated = await service.updateMember("owner-1", club.id, member.id, {
        displayName: "Lucas Silva",
        jerseyNumber: 9,
        position: "Pivo"
      });

      expect(updated).toMatchObject({
        displayName: "Lucas Silva",
        jerseyNumber: 9,
        position: "Pivo"
      });
      expect(
        repository.auditLogs.some((log) => log.action === "CLUB_MEMBER_UPDATED")
      ).toBe(true);
    });

    it("rejects renaming to an existing member name", async () => {
      const club = await createClub();
      const first = await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      await service.addMember("owner-1", club.id, {
        displayName: "Ana",
        jerseyNumber: 7,
        position: "Pivo"
      });

      await expect(
        service.updateMember("owner-1", club.id, first.id, {
          displayName: "Ana",
          jerseyNumber: 10,
          position: "Ala"
        })
      ).rejects.toMatchObject({ code: "CLUB_MEMBER_NAME_IN_USE" });
    });
  });

  describe("selective import", () => {
    it("copies only the selected members into the team arena", async () => {
      const arena = await createTeamArena();
      const club = await createClub();
      const lucas = await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      await service.addMember("owner-1", club.id, {
        displayName: "Ana",
        jerseyNumber: 7,
        position: "Pivo"
      });

      await service.importIntoChampionship("owner-1", club.id, arena.id, [lucas.id]);

      expect(repository.imports[0]?.club.members).toHaveLength(1);
      expect(repository.imports[0]?.club.members[0]?.displayName).toBe("Lucas");
    });

    it("rejects selecting members from another club", async () => {
      const arena = await createTeamArena();
      const club = await createClub();
      const other = await service.create("owner-1", {
        name: "Outro Clube",
        shortName: null,
        logoUrl: null
      });
      const member = await service.addMember("owner-1", other.id, {
        displayName: "X",
        jerseyNumber: 1,
        position: null
      });

      await expect(
        service.importIntoChampionship("owner-1", club.id, arena.id, [member.id])
      ).rejects.toMatchObject({ code: "INVALID_MEMBER_SELECTION" });
    });
  });

  describe("seasons", () => {
    it("creates, updates and deletes seasons", async () => {
      const club = await createClub();
      const season = await service.addSeason("owner-1", club.id, {
        name: "2026",
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2026-12-31")
      });
      expect(season.name).toBe("2026");

      const updated = await service.updateSeason("owner-1", club.id, season.id, {
        name: "Temporada 2026",
        startsAt: null,
        endsAt: null
      });
      expect(updated.name).toBe("Temporada 2026");

      await service.deleteSeason("owner-1", club.id, season.id);
      const after = await repository.findById(club.id);
      expect(after?.seasons).toHaveLength(0);
    });

    it("rejects inverted season dates", async () => {
      const club = await createClub();
      await expect(
        service.addSeason("owner-1", club.id, {
          name: "2026",
          startsAt: new Date("2026-12-31"),
          endsAt: new Date("2026-01-01")
        })
      ).rejects.toMatchObject({ code: "INVALID_CLUB_SEASON_DATES" });
    });
  });

  describe("squads", () => {
    it("creates squads and manages squad members", async () => {
      const club = await createClub();
      const lucas = await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      await service.addMember("owner-1", club.id, {
        displayName: "Ana",
        jerseyNumber: 7,
        position: "Pivo"
      });
      const squad = await service.addSquad("owner-1", club.id, {
        name: "Masculino 2026",
        category: "Masculino",
        sport: "Futsal",
        seasonId: null,
        isPrimary: true
      });

      await service.setSquadMembers("owner-1", club.id, squad.id, [
        { clubMemberId: lucas.id, role: "PLAYER" }
      ]);

      const after = await repository.findById(club.id);
      expect(after?.squads[0]?.members).toHaveLength(1);
      expect(after?.squads[0]?.isPrimary).toBe(true);
    });

    it("rejects duplicate members in a squad", async () => {
      const club = await createClub();
      const lucas = await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      const squad = await service.addSquad("owner-1", club.id, {
        name: "Elenco A",
        category: null,
        sport: null,
        seasonId: null,
        isPrimary: false
      });

      await expect(
        service.setSquadMembers("owner-1", club.id, squad.id, [
          { clubMemberId: lucas.id, role: "PLAYER" },
          { clubMemberId: lucas.id, role: "CAPTAIN" }
        ])
      ).rejects.toMatchObject({ code: "DUPLICATE_SQUAD_MEMBER" });
    });

    it("rejects linking a member from another club", async () => {
      const club = await createClub();
      const other = await service.create("owner-1", {
        name: "Outro",
        shortName: null,
        logoUrl: null
      });
      const member = await service.addMember("owner-1", other.id, {
        displayName: "X",
        jerseyNumber: 1,
        position: null
      });
      const squad = await service.addSquad("owner-1", club.id, {
        name: "Elenco A",
        category: null,
        sport: null,
        seasonId: null,
        isPrimary: false
      });

      await expect(
        service.setSquadMembers("owner-1", club.id, squad.id, [
          { clubMemberId: member.id, role: "PLAYER" }
        ])
      ).rejects.toThrow();
    });
  });

  describe("staff", () => {
    it("adds and removes staff members", async () => {
      const club = await createClub();
      const coach = await service.addStaff("owner-1", club.id, {
        displayName: "Carlos",
        role: "Tecnico"
      });
      expect(coach.role).toBe("Tecnico");

      await service.deleteStaff("owner-1", club.id, coach.id);
      const after = await repository.findById(club.id);
      expect(after?.staff).toHaveLength(0);
    });

    it("rejects duplicate staff names", async () => {
      const club = await createClub();
      await service.addStaff("owner-1", club.id, {
        displayName: "Carlos",
        role: "Tecnico"
      });
      await expect(
        service.addStaff("owner-1", club.id, {
          displayName: "carlos",
          role: "Auxiliar"
        })
      ).rejects.toMatchObject({ code: "CLUB_STAFF_NAME_IN_USE" });
    });
  });

  describe("team sync", () => {
    async function setupTeam() {
      const club = await createClub();
      await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      await service.addMember("owner-1", club.id, {
        displayName: "Ana",
        jerseyNumber: 7,
        position: "Pivo"
      });
      const teamId = crypto.randomUUID();
      repository.teams.push({
        id: teamId,
        championshipId: crypto.randomUUID(),
        sourceClubId: club.id,
        name: "Arena Azul",
        members: [
          {
            id: crypto.randomUUID(),
            sourceClubMemberId: club.members[0]?.id ?? null,
            displayName: "Lucas",
            jerseyNumber: 10,
            position: "Ala",
            isCaptain: false
          },
          {
            id: crypto.randomUUID(),
            sourceClubMemberId: null,
            displayName: "Bia",
            jerseyNumber: 11,
            position: "Zagueira",
            isCaptain: false
          }
        ]
      });
      return { club, teamId };
    }

    it("previews adds, updates and removals", async () => {
      const { club, teamId } = await setupTeam();
      const preview = await service.previewTeamSync("owner-1", club.id, teamId);

      expect(preview.diff.toAdd.map((item) => item.displayName)).toEqual(["Ana"]);
      expect(preview.diff.toRemove.map((item) => item.displayName)).toEqual(["Bia"]);
      expect(preview.diff.toUpdate).toHaveLength(0);
    });

    it("applies the sync without removing protected members", async () => {
      const { club, teamId } = await setupTeam();
      const team = await repository.findTeamWithMembers(teamId);
      const protectedMember = team?.members.find(
        (member) => member.displayName === "Bia"
      );
      if (!team || !protectedMember) throw new Error("setup");
      repository.protectedMemberIds.add(protectedMember.id);

      const result = await service.applyTeamSync("owner-1", club.id, teamId);

      expect(result.diff.protectedMembers).toHaveLength(1);
      const after = await repository.findTeamWithMembers(teamId);
      expect(after?.members.map((member) => member.displayName).sort()).toEqual(
        ["Ana", "Bia", "Lucas"].sort()
      );
      expect(
        repository.auditLogs.some((log) => log.action === "TEAM_SYNCED")
      ).toBe(true);
    });

    it("renames a player in the club without duplicating the team member", async () => {
      const club = await createClub();
      const lucas = await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      const teamId = crypto.randomUUID();
      repository.teams.push({
        id: teamId,
        championshipId: crypto.randomUUID(),
        sourceClubId: club.id,
        name: "Arena Azul",
        members: [
          {
            id: crypto.randomUUID(),
            sourceClubMemberId: lucas.id,
            displayName: "Lucas",
            jerseyNumber: 10,
            position: "Ala",
            isCaptain: false
          }
        ]
      });

      await service.updateMember("owner-1", club.id, lucas.id, {
        displayName: "Lucas Silva",
        jerseyNumber: 10,
        position: "Ala"
      });

      const preview = await service.previewTeamSync("owner-1", club.id, teamId);
      expect(preview.diff.toAdd).toHaveLength(0);
      expect(preview.diff.toRemove).toHaveLength(0);
      expect(preview.diff.toUpdate.map((item) => item.displayName)).toEqual([
        "Lucas Silva"
      ]);

      await service.applyTeamSync("owner-1", club.id, teamId);
      const after = await repository.findTeamWithMembers(teamId);
      expect(after?.members.map((member) => member.displayName)).toEqual([
        "Lucas Silva"
      ]);
      expect(after?.members).toHaveLength(1);
    });

    it("rejects syncing a team not linked to the club", async () => {
      const club = await createClub();
      const teamId = crypto.randomUUID();
      repository.teams.push({
        id: teamId,
        championshipId: crypto.randomUUID(),
        sourceClubId: null,
        name: "Outra",
        members: []
      });

      await expect(
        service.previewTeamSync("owner-1", club.id, teamId)
      ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND" });
    });
  });

  describe("roster import/export", () => {
    it("exports and re-imports a JSON roster", async () => {
      const club = await createClub();
      await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });

      const exported = await service.exportRoster("owner-1", club.id, "json");
      const result = await service.importRoster(
        "owner-1",
        club.id,
        "json",
        exported.content
      );
      expect(result).toEqual({ created: 0, updated: 0, skipped: 1 });
    });

    it("exports a CSV roster with header", async () => {
      const club = await createClub();
      await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });

      const exported = await service.exportRoster("owner-1", club.id, "csv");
      expect(exported.contentType).toContain("text/csv");
      expect(exported.content.split("\n")[0]).toBe("nome,camisa,posicao,capitao");
    });

    it("imports a CSV roster and updates existing members", async () => {
      const club = await createClub();
      await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });

      const result = await service.importRoster(
        "owner-1",
        club.id,
        "csv",
        ["nome,camisa,posicao,capitao", "Lucas,9,Ala,nao", "Ana,7,Pivo,sim"].join("\n")
      );

      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      const after = await repository.findById(club.id);
      const lucas = after?.members.find((member) => member.displayName === "Lucas");
      expect(lucas?.jerseyNumber).toBe(9);
    });

    it("rejects duplicate names inside the imported roster", async () => {
      const club = await createClub();
      await expect(
        service.importRoster(
          "owner-1",
          club.id,
          "json",
          JSON.stringify([
            { displayName: "Lucas", jerseyNumber: 10, position: null },
            { displayName: "lucas", jerseyNumber: 7, position: null }
          ])
        )
      ).rejects.toMatchObject({ code: "DUPLICATE_ROSTER_ROW" });
    });

    it("round-trips a CSV roster with commas, quotes and line breaks", async () => {
      const source = await createClub();
      await service.addMember("owner-1", source.id, {
        displayName: "Silva, Joao",
        jerseyNumber: 8,
        position: "Zagueiro"
      });
      await service.addMember("owner-1", source.id, {
        displayName: "Ana \"Rainha\"",
        jerseyNumber: 7,
        position: "Pivo"
      });

      const exported = await service.exportRoster("owner-1", source.id, "csv");
      const target = await service.create("owner-1", {
        name: "Arena Vermelha",
        shortName: "AV",
        logoUrl: null
      });
      const result = await service.importRoster(
        "owner-1",
        target.id,
        "csv",
        exported.content
      );

      expect(result.created).toBe(2);
      const after = await repository.findById(target.id);
      expect(after?.members.map((member) => member.displayName).sort()).toEqual(
        ["Ana \"Rainha\"", "Silva, Joao"].sort()
      );
      expect(after?.members.find((member) => member.displayName === "Silva, Joao")?.jerseyNumber).toBe(8);
    });

    it("imports CSV with CRLF, empty fields and quoted values", async () => {
      const club = await createClub();
      const csv = "nome,camisa,posicao,capitao\r\n\"Rocha, Lima\",,Goleiro,sim\r\nBia,4,,nao";
      const result = await service.importRoster("owner-1", club.id, "csv", csv);
      expect(result.created).toBe(2);
      const after = await repository.findById(club.id);
      const rocha = after?.members.find((member) => member.displayName === "Rocha, Lima");
      expect(rocha?.jerseyNumber).toBeNull();
      expect(rocha?.position).toBe("Goleiro");
      expect(rocha?.isCaptain).toBe(true);
      const bia = after?.members.find((member) => member.displayName === "Bia");
      expect(bia?.position).toBeNull();
      expect(bia?.isCaptain).toBe(false);
    });

    it("associates only imported players to the squad", async () => {
      const club = await createClub();
      await service.addMember("owner-1", club.id, {
        displayName: "Veterano",
        jerseyNumber: 1,
        position: null
      });
      const squad = await service.addSquad("owner-1", club.id, {
        name: "Principal",
        category: null,
        sport: null,
        seasonId: null,
        isPrimary: true
      });

      const result = await service.importRoster(
        "owner-1",
        club.id,
        "csv",
        ["nome,camisa,posicao,capitao", "Novato,2,Ala,nao"].join("\n"),
        squad.id
      );

      expect(result.created).toBe(1);
      const after = await repository.findById(club.id);
      const squadAfter = after?.squads.find((item) => item.id === squad.id);
      expect(squadAfter?.members).toHaveLength(1);
      expect(squadAfter?.members[0]?.clubMemberId).toBe(
        after?.members.find((member) => member.displayName === "Novato")?.id
      );
    });

    it("links an existing club member present in the file without creating or updating", async () => {
      const club = await createClub();
      await service.addMember("owner-1", club.id, {
        displayName: "Lucas",
        jerseyNumber: 10,
        position: "Ala"
      });
      const squad = await service.addSquad("owner-1", club.id, {
        name: "Principal",
        category: null,
        sport: null,
        seasonId: null,
        isPrimary: true
      });

      const result = await service.importRoster(
        "owner-1",
        club.id,
        "csv",
        ["nome,camisa,posicao,capitao", "Lucas,10,Ala,nao"].join("\n"),
        squad.id
      );

      expect(result).toEqual({ created: 0, updated: 0, skipped: 1 });
      const after = await repository.findById(club.id);
      const lucas = after?.members.find((member) => member.displayName === "Lucas");
      const squadAfter = after?.squads.find((item) => item.id === squad.id);
      expect(squadAfter?.members).toHaveLength(1);
      expect(squadAfter?.members[0]?.clubMemberId).toBe(lucas?.id);
    });

    it("does not duplicate squad members when the same roster is imported twice", async () => {
      const club = await createClub();
      const squad = await service.addSquad("owner-1", club.id, {
        name: "Principal",
        category: null,
        sport: null,
        seasonId: null,
        isPrimary: true
      });
      const csv = ["nome,camisa,posicao,capitao", "Lucas,10,Ala,nao"].join("\n");

      await service.importRoster("owner-1", club.id, "csv", csv, squad.id);
      await service.importRoster("owner-1", club.id, "csv", csv, squad.id);

      const after = await repository.findById(club.id);
      const squadAfter = after?.squads.find((item) => item.id === squad.id);
      expect(squadAfter?.members).toHaveLength(1);
    });

    it("rejects rows without a valid name", async () => {
      const club = await createClub();
      await expect(
        service.importRoster(
          "owner-1",
          club.id,
          "json",
          JSON.stringify([
            { displayName: "", jerseyNumber: 10, position: null }
          ])
        )
      ).rejects.toMatchObject({ code: "INVALID_ROSTER_FORMAT" });
    });
  });

  describe("club identity colors", () => {
    it("accepts optional colors when creating a club", async () => {
      const club = await createClub();
      expect(club.primaryColor).toBeNull();
      expect(club.awayKit).toBeNull();
    });

    it("stores colors and kits on update", async () => {
      const club = await createClub();
      const updated = await service.update("owner-1", club.id, {
        name: "Arena Azul",
        shortName: "AA",
        logoUrl: null,
        primaryColor: "#123456",
        secondaryColor: "#abcdef",
        homeKit: "Azul e branco",
        awayKit: "Branco"
      });
      expect(updated.primaryColor).toBe("#123456");
      expect(updated.homeKit).toBe("Azul e branco");
    });
  });
});