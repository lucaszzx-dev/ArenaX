import type {
  Club,
  ClubIdentity,
  ClubMember,
  ClubMemberInput,
  ClubRepository,
  ClubSeason,
  ClubSeasonInput,
  ClubSquad,
  ClubSquadInput,
  ClubStaff,
  ClubStaffInput,
  ImportMemberRow,
  RosterImportResult,
  SquadMemberRef,
  TeamSyncDiff
} from "../../src/clubs/club-repository.js";

export class InMemoryClubRepository implements ClubRepository {
  readonly clubs: Club[] = [];
  readonly imports: Array<{ club: Club; championshipId: string; teamId: string }> = [];
  readonly teams: Array<{
    id: string;
    championshipId: string;
    sourceClubId: string | null;
    name: string;
    members: Array<{
      id: string;
      sourceClubMemberId: string | null;
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
      isCaptain: boolean;
    }>;
  }> = [];
  readonly protectedMemberIds = new Set<string>();
  readonly auditLogs: Array<{
    clubId: string;
    actorId: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: Date;
  }> = [];

  async listByOwner(ownerId: string) {
    return this.clubs.filter((club) => club.ownerId === ownerId);
  }

  async findById(clubId: string) {
    return this.clubs.find((club) => club.id === clubId) ?? null;
  }

  async create(ownerId: string, input: ClubIdentity) {
    const now = new Date();
    const club: Club = {
      id: crypto.randomUUID(),
      ownerId,
      name: input.name,
      shortName: input.shortName,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor ?? null,
      secondaryColor: input.secondaryColor ?? null,
      homeKit: input.homeKit ?? null,
      awayKit: input.awayKit ?? null,
      createdAt: now,
      updatedAt: now,
      members: [],
      seasons: [],
      squads: [],
      staff: []
    };
    this.clubs.push(club);
    return club;
  }

  async update(clubId: string, input: ClubIdentity) {
    const club = this.clubs.find((item) => item.id === clubId);
    if (!club) throw new Error("Clube nao encontrado.");
    Object.assign(club, input, { updatedAt: new Date() });
    return club;
  }

  async delete(clubId: string) {
    const index = this.clubs.findIndex((club) => club.id === clubId);
    if (index < 0) return false;
    this.clubs.splice(index, 1);
    return true;
  }

  async addMember(clubId: string, input: ClubMemberInput) {
    const member: ClubMember = {
      id: crypto.randomUUID(),
      clubId,
      ...input,
      isCaptain: false,
      createdAt: new Date()
    };
    this.clubs.find((club) => club.id === clubId)?.members.push(member);
    return member;
  }

  async updateMember(clubId: string, memberId: string, input: ClubMemberInput) {
    const member = this.clubs
      .find((club) => club.id === clubId)
      ?.members.find((item) => item.id === memberId);
    if (!member) throw new Error("Jogador nao encontrado.");
    Object.assign(member, input);
    return member;
  }

  async deleteMember(clubId: string, memberId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    const index = club?.members.findIndex((member) => member.id === memberId) ?? -1;
    if (!club || index < 0) return false;
    club.members.splice(index, 1);
    return true;
  }

  async setCaptain(clubId: string, memberId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    if (!club) throw new Error("Clube nao encontrado.");
    club.members.forEach((member) => {
      member.isCaptain = member.id === memberId;
    });
    return club;
  }

  async addSeason(clubId: string, input: ClubSeasonInput) {
    const season: ClubSeason = {
      id: crypto.randomUUID(),
      clubId,
      ...input,
      createdAt: new Date()
    };
    this.clubs.find((club) => club.id === clubId)?.seasons.push(season);
    return season;
  }

  async updateSeason(clubId: string, seasonId: string, input: ClubSeasonInput) {
    const season = this.clubs
      .find((club) => club.id === clubId)
      ?.seasons.find((item) => item.id === seasonId);
    if (!season) throw new Error("Temporada nao encontrada.");
    Object.assign(season, input);
    return season;
  }

  async deleteSeason(clubId: string, seasonId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    const index = club?.seasons.findIndex((season) => season.id === seasonId) ?? -1;
    if (!club || index < 0) return false;
    club.seasons.splice(index, 1);
    return true;
  }

  async addSquad(clubId: string, input: ClubSquadInput) {
    const club = this.clubs.find((item) => item.id === clubId);
    if (!club) throw new Error("Clube nao encontrado.");
    if (input.isPrimary) {
      club.squads.forEach((squad) => { squad.isPrimary = false; });
    }
    const squad: ClubSquad = {
      id: crypto.randomUUID(),
      clubId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: []
    };
    club.squads.push(squad);
    return squad;
  }

  async updateSquad(clubId: string, squadId: string, input: ClubSquadInput) {
    const club = this.clubs.find((item) => item.id === clubId);
    const squad = club?.squads.find((item) => item.id === squadId);
    if (!club || !squad) throw new Error("Elenco nao encontrado.");
    if (input.isPrimary) {
      club.squads.forEach((item) => { item.isPrimary = false; });
    }
    Object.assign(squad, input, { updatedAt: new Date() });
    return squad;
  }

  async deleteSquad(clubId: string, squadId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    const index = club?.squads.findIndex((squad) => squad.id === squadId) ?? -1;
    if (!club || index < 0) return false;
    club.squads.splice(index, 1);
    return true;
  }

  async setSquadMembers(clubId: string, squadId: string, members: SquadMemberRef[]) {
    const club = this.clubs.find((item) => item.id === clubId);
    const squad = club?.squads.find((item) => item.id === squadId);
    if (!club || !squad) throw new Error("Elenco nao encontrado.");
    const valid = new Set(club.members.map((member) => member.id));
    if (members.some((member) => !valid.has(member.clubMemberId))) {
      throw new Error("Um dos jogadores nao pertence ao clube.");
    }
    squad.members = members.map((member) => ({ ...member }));
    return squad;
  }

  async addStaff(clubId: string, input: ClubStaffInput) {
    const staff: ClubStaff = {
      id: crypto.randomUUID(),
      clubId,
      ...input,
      createdAt: new Date()
    };
    this.clubs.find((club) => club.id === clubId)?.staff.push(staff);
    return staff;
  }

  async deleteStaff(clubId: string, staffId: string) {
    const club = this.clubs.find((item) => item.id === clubId);
    const index = club?.staff.findIndex((staff) => staff.id === staffId) ?? -1;
    if (!club || index < 0) return false;
    club.staff.splice(index, 1);
    return true;
  }

  async importIntoChampionship(club: Club, championshipId: string, memberIds?: string[]) {
    if (this.imports.some((item) =>
      item.club.id === club.id && item.championshipId === championshipId
    )) {
      throw Object.assign(new Error("duplicate"), { code: "23505" });
    }
    const teamId = crypto.randomUUID();
    const members = memberIds
      ? club.members.filter((member) => memberIds.includes(member.id))
      : club.members;
    this.teams.push({
      id: teamId,
      championshipId,
      sourceClubId: club.id,
      name: club.name,
      members: members.map((member) => ({
        id: crypto.randomUUID(),
        sourceClubMemberId: member.id,
        displayName: member.displayName,
        jerseyNumber: member.jerseyNumber,
        position: member.position,
        isCaptain: member.isCaptain
      }))
    });
    this.imports.push({
      championshipId,
      teamId,
      club: structuredClone({ ...club, members })
    });
    return teamId;
  }

  async listImportedTeams(clubId: string) {
    return this.teams
      .filter((team) => team.sourceClubId === clubId)
      .map((team) => ({
        id: team.id,
        championshipId: team.championshipId,
        name: team.name,
        shortName: null,
        logoUrl: null
      }));
  }

  async findTeamWithMembers(teamId: string) {
    const team = this.teams.find((item) => item.id === teamId);
    if (!team) return null;
    return {
      id: team.id,
      championshipId: team.championshipId,
      sourceClubId: team.sourceClubId,
      name: team.name,
      members: team.members.map((member) => ({ ...member }))
    };
  }

  async findProtectedTeamMemberIds(teamId: string) {
    const team = this.teams.find((item) => item.id === teamId);
    if (!team) return [];
    return team.members
      .filter((member) => this.protectedMemberIds.has(member.id))
      .map((member) => member.id);
  }

  async applyTeamSync(teamId: string, diff: TeamSyncDiff) {
    const team = this.teams.find((item) => item.id === teamId);
    if (!team) throw new Error("Equipe nao encontrada.");

    const protectedIds = new Set(
      await this.findProtectedTeamMemberIds(teamId)
    );
    const removable = new Set(
      diff.toRemove.map((member) => member.teamMemberId)
    );
    team.members = team.members.filter((member) =>
      !removable.has(member.id) || protectedIds.has(member.id)
    );

    for (const member of diff.toUpdate) {
      const current = team.members.find((item) => item.id === member.teamMemberId);
      if (current) {
        current.sourceClubMemberId = member.sourceClubMemberId;
        current.displayName = member.displayName;
        current.jerseyNumber = member.jerseyNumber;
        current.position = member.position;
        current.isCaptain = member.isCaptain;
      }
    }

    for (const member of diff.toAdd) {
      team.members.push({
        id: crypto.randomUUID(),
        sourceClubMemberId: member.clubMemberId,
        displayName: member.displayName,
        jerseyNumber: member.jerseyNumber,
        position: member.position,
        isCaptain: member.isCaptain
      });
    }
  }

  async importRoster(
    clubId: string,
    rows: ImportMemberRow[],
    squadId?: string
  ): Promise<RosterImportResult> {
    const club = this.clubs.find((item) => item.id === clubId);
    if (!club) throw new Error("Clube nao encontrado.");
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const importedMembers: ClubMember[] = [];
    for (const row of rows) {
      const existing = club.members.find((member) =>
        member.displayName.trim().toLocaleLowerCase("pt-BR") ===
        row.displayName.trim().toLocaleLowerCase("pt-BR")
      );
      if (existing) {
        importedMembers.push(existing);
        const changed =
          existing.jerseyNumber !== row.jerseyNumber ||
          existing.position !== row.position ||
          existing.isCaptain !== row.isCaptain;
        if (changed) {
          Object.assign(existing, row);
          updated += 1;
        } else {
          skipped += 1;
        }
      } else {
        const member: ClubMember = {
          id: crypto.randomUUID(),
          clubId,
          ...row,
          createdAt: new Date()
        };
        club.members.push(member);
        importedMembers.push(member);
        created += 1;
      }
    }
    if (squadId) {
      const squad = club.squads.find((item) => item.id === squadId);
      if (!squad) throw new Error("Elenco nao encontrado.");
      for (const member of importedMembers) {
        if (!squad.members.some((item) => item.clubMemberId === member.id)) {
          squad.members.push({ clubMemberId: member.id, role: "PLAYER" });
        }
      }
    }
    return { created, updated, skipped };
  }

  async recordAudit(
    actorId: string,
    clubId: string,
    action: string,
    details: Record<string, unknown>
  ) {
    this.auditLogs.push({
      actorId,
      clubId,
      action,
      details,
      createdAt: new Date()
    });
  }

  async listAuditLogs(clubId: string) {
    return this.auditLogs
      .filter((log) => log.clubId === clubId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
