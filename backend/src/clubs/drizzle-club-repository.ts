import { and, asc, eq, inArray, ne } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  championshipEntries,
  clubAuditLogs,
  clubMembers,
  clubSeasons,
  clubSquadMembers,
  clubSquads,
  clubStaff,
  clubs,
  matchEvents,
  matchLineups,
  teamMembers,
  teams
} from "../db/schema.js";
import type {
  Club,
  ClubIdentity,
  ClubMemberInput,
  ClubRepository,
  ClubSeasonInput,
  ClubSquad,
  ClubSquadInput,
  ClubStaffInput,
  ImportMemberRow,
  RosterImportResult,
  SquadMemberRef,
  TeamSyncDiff
} from "./club-repository.js";

export class DrizzleClubRepository implements ClubRepository {
  constructor(private readonly db: Database) {}

  async listByOwner(ownerId: string) {
    const rows = await this.db
      .select()
      .from(clubs)
      .where(eq(clubs.ownerId, ownerId))
      .orderBy(asc(clubs.name));
    return Promise.all(rows.map((club) => this.withDetails(club)));
  }

  async findById(clubId: string) {
    const [club] = await this.db.select().from(clubs).where(eq(clubs.id, clubId));
    return club ? this.withDetails(club) : null;
  }

  async create(ownerId: string, input: ClubIdentity) {
    const [club] = await this.db.insert(clubs).values({ ownerId, ...input }).returning();
    if (!club) throw new Error("Nao foi possivel criar o clube.");
    return this.withDetails(club);
  }

  async update(clubId: string, input: ClubIdentity) {
    const [club] = await this.db
      .update(clubs)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(clubs.id, clubId))
      .returning();
    if (!club) throw new Error("Nao foi possivel atualizar o clube.");
    return this.withDetails(club);
  }

  async delete(clubId: string) {
    const rows = await this.db
      .delete(clubs)
      .where(eq(clubs.id, clubId))
      .returning({ id: clubs.id });
    return rows.length > 0;
  }

  async addMember(clubId: string, input: ClubMemberInput) {
    const [member] = await this.db
      .insert(clubMembers)
      .values({ clubId, ...input })
      .returning();
    if (!member) throw new Error("Nao foi possivel adicionar o jogador.");
    return member;
  }

  async updateMember(clubId: string, memberId: string, input: ClubMemberInput) {
    const [member] = await this.db
      .update(clubMembers)
      .set(input)
      .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.id, memberId)))
      .returning();
    if (!member) throw new Error("Jogador nao encontrado.");
    return member;
  }

  async deleteMember(clubId: string, memberId: string) {
    const rows = await this.db
      .delete(clubMembers)
      .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.id, memberId)))
      .returning({ id: clubMembers.id });
    return rows.length > 0;
  }

  async setCaptain(clubId: string, memberId: string) {
    return this.db.transaction(async (transaction) => {
      await transaction
        .update(clubMembers)
        .set({ isCaptain: false })
        .where(eq(clubMembers.clubId, clubId));
      const [member] = await transaction
        .update(clubMembers)
        .set({ isCaptain: true })
        .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.id, memberId)))
        .returning();
      if (!member) throw new Error("Jogador nao encontrado.");
      const [club] = await transaction.select().from(clubs).where(eq(clubs.id, clubId));
      if (!club) throw new Error("Clube nao encontrado.");
      return this.withDetails(club);
    });
  }

  async addSeason(clubId: string, input: ClubSeasonInput) {
    const [season] = await this.db
      .insert(clubSeasons)
      .values({ clubId, ...input })
      .returning();
    if (!season) throw new Error("Nao foi possivel criar a temporada.");
    return season;
  }

  async updateSeason(clubId: string, seasonId: string, input: ClubSeasonInput) {
    const [season] = await this.db
      .update(clubSeasons)
      .set(input)
      .where(and(eq(clubSeasons.clubId, clubId), eq(clubSeasons.id, seasonId)))
      .returning();
    if (!season) throw new Error("Temporada nao encontrada.");
    return season;
  }

  async deleteSeason(clubId: string, seasonId: string) {
    const rows = await this.db
      .delete(clubSeasons)
      .where(and(eq(clubSeasons.clubId, clubId), eq(clubSeasons.id, seasonId)))
      .returning({ id: clubSeasons.id });
    return rows.length > 0;
  }

  async addSquad(clubId: string, input: ClubSquadInput) {
    return this.db.transaction(async (transaction) => {
      const [squad] = await transaction
        .insert(clubSquads)
        .values({ clubId, ...input })
        .returning();
      if (!squad) throw new Error("Nao foi possivel criar o elenco.");
      if (input.isPrimary) {
        await transaction
          .update(clubSquads)
          .set({ isPrimary: false })
          .where(and(eq(clubSquads.clubId, clubId), ne(clubSquads.id, squad.id)));
      }
      return { ...squad, members: [] };
    });
  }

  async updateSquad(clubId: string, squadId: string, input: ClubSquadInput) {
    return this.db.transaction(async (transaction) => {
      const [squad] = await transaction
        .update(clubSquads)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(clubSquads.clubId, clubId), eq(clubSquads.id, squadId)))
        .returning();
      if (!squad) throw new Error("Elenco nao encontrado.");
      if (input.isPrimary) {
        await transaction
          .update(clubSquads)
          .set({ isPrimary: false })
          .where(and(eq(clubSquads.clubId, clubId), ne(clubSquads.id, squad.id)));
      }
      return this.withSquadMembers(transaction, squad);
    });
  }

  async deleteSquad(clubId: string, squadId: string) {
    const rows = await this.db
      .delete(clubSquads)
      .where(and(eq(clubSquads.clubId, clubId), eq(clubSquads.id, squadId)))
      .returning({ id: clubSquads.id });
    return rows.length > 0;
  }

  async setSquadMembers(clubId: string, squadId: string, members: SquadMemberRef[]) {
    return this.db.transaction(async (transaction) => {
      const [squad] = await transaction
        .select()
        .from(clubSquads)
        .where(and(eq(clubSquads.clubId, clubId), eq(clubSquads.id, squadId)));
      if (!squad) throw new Error("Elenco nao encontrado.");
      const memberIds = members.map((member) => member.clubMemberId);
      if (memberIds.length) {
        const valid = await transaction
          .select({ id: clubMembers.id })
          .from(clubMembers)
          .where(and(
            eq(clubMembers.clubId, clubId),
            inArray(clubMembers.id, memberIds)
          ));
        if (valid.length !== new Set(memberIds).size) {
          throw new Error("Um dos jogadores nao pertence ao clube.");
        }
      }
      await transaction
        .delete(clubSquadMembers)
        .where(eq(clubSquadMembers.squadId, squadId));
      if (members.length) {
        await transaction.insert(clubSquadMembers).values(
          members.map((member) => ({ squadId, ...member }))
        );
      }
      return this.withSquadMembers(transaction, squad);
    });
  }

  async addStaff(clubId: string, input: ClubStaffInput) {
    const [staff] = await this.db
      .insert(clubStaff)
      .values({ clubId, ...input })
      .returning();
    if (!staff) throw new Error("Nao foi possivel adicionar a comissao.");
    return staff;
  }

  async deleteStaff(clubId: string, staffId: string) {
    const rows = await this.db
      .delete(clubStaff)
      .where(and(eq(clubStaff.clubId, clubId), eq(clubStaff.id, staffId)))
      .returning({ id: clubStaff.id });
    return rows.length > 0;
  }

  async importIntoChampionship(
    club: Club,
    championshipId: string,
    memberIds?: string[]
  ) {
    return this.db.transaction(async (transaction) => {
      const [team] = await transaction
        .insert(teams)
        .values({
          championshipId,
          name: club.name,
          shortName: club.shortName,
          logoUrl: club.logoUrl,
          sourceClubId: club.id
        })
        .returning();
      if (!team) throw new Error("Nao foi possivel importar o clube.");

      await transaction.insert(championshipEntries).values({
        championshipId,
        kind: "TEAM",
        displayName: club.name,
        teamId: team.id
      });

      const selected = memberIds
        ? club.members.filter((member) => memberIds.includes(member.id))
        : club.members;
      if (selected.length) {
        await transaction.insert(teamMembers).values(
          selected.map((member) => ({
            teamId: team.id,
            displayName: member.displayName,
            jerseyNumber: member.jerseyNumber,
            position: member.position,
            isCaptain: member.isCaptain
          }))
        );
      }
      return team.id;
    });
  }

  async listImportedTeams(clubId: string) {
    const rows = await this.db
      .select({
        id: teams.id,
        championshipId: teams.championshipId,
        name: teams.name,
        shortName: teams.shortName,
        logoUrl: teams.logoUrl
      })
      .from(teams)
      .where(eq(teams.sourceClubId, clubId))
      .orderBy(asc(teams.name));
    return rows;
  }

  async findTeamWithMembers(teamId: string) {
    const [team] = await this.db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) return null;
    const members = await this.db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(asc(teamMembers.displayName));
    return {
      id: team.id,
      championshipId: team.championshipId,
      sourceClubId: team.sourceClubId,
      name: team.name,
      members: members.map((member) => ({
        id: member.id,
        displayName: member.displayName,
        jerseyNumber: member.jerseyNumber,
        position: member.position,
        isCaptain: member.isCaptain
      }))
    };
  }

  async findProtectedTeamMemberIds(teamId: string) {
    const memberRows = await this.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    const memberIds = memberRows.map((row) => row.id);
    if (!memberIds.length) return [];

    const eventRows = await this.db
      .select({ teamMemberId: matchEvents.teamMemberId })
      .from(matchEvents)
      .where(inArray(matchEvents.teamMemberId, memberIds));
    const eventIds = eventRows
      .map((row) => row.teamMemberId)
      .filter((id): id is string => id !== null);

    const lineupRows = await this.db
      .select({ teamMemberId: matchLineups.teamMemberId })
      .from(matchLineups)
      .where(inArray(matchLineups.teamMemberId, memberIds));
    return [...new Set([...eventIds, ...lineupRows.map((row) => row.teamMemberId)])];
  }

  async applyTeamSync(teamId: string, diff: TeamSyncDiff) {
    await this.db.transaction(async (transaction) => {
      if (diff.toAdd.length) {
        await transaction.insert(teamMembers).values(
          diff.toAdd.map((member) => ({ teamId, ...member }))
        );
      }
      for (const member of diff.toUpdate) {
        await transaction
          .update(teamMembers)
          .set({
            displayName: member.displayName,
            jerseyNumber: member.jerseyNumber,
            position: member.position,
            isCaptain: member.isCaptain
          })
          .where(and(
            eq(teamMembers.id, member.teamMemberId),
            eq(teamMembers.teamId, teamId)
          ));
      }
      if (diff.toRemove.length) {
        await transaction
          .delete(teamMembers)
          .where(and(
            eq(teamMembers.teamId, teamId),
            inArray(
              teamMembers.id,
              diff.toRemove.map((member) => member.teamMemberId)
            )
          ));
      }
    });
  }

  async importRoster(
    clubId: string,
    rows: ImportMemberRow[],
    squadId?: string
  ): Promise<RosterImportResult> {
    return this.db.transaction(async (transaction) => {
      const existing = await transaction
        .select()
        .from(clubMembers)
        .where(eq(clubMembers.clubId, clubId));
      const byName = new Map(
        existing.map((member) => [this.normalize(member.displayName), member])
      );
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        const key = this.normalize(row.displayName);
        const current = byName.get(key);
        if (current) {
          const changed =
            current.jerseyNumber !== row.jerseyNumber ||
            current.position !== row.position ||
            current.isCaptain !== row.isCaptain;
          if (!changed) {
            skipped += 1;
          } else {
            await transaction
              .update(clubMembers)
              .set({
                jerseyNumber: row.jerseyNumber,
                position: row.position,
                isCaptain: row.isCaptain
              })
              .where(eq(clubMembers.id, current.id));
            byName.set(key, { ...current, ...row });
            updated += 1;
          }
          continue;
        }
        const [member] = await transaction
          .insert(clubMembers)
          .values({ clubId, ...row })
          .returning();
        if (!member) throw new Error("Nao foi possivel importar o jogador.");
        byName.set(key, member);
        created += 1;
      }

      if (squadId && (created > 0 || updated > 0)) {
        const [squad] = await transaction
          .select()
          .from(clubSquads)
          .where(and(eq(clubSquads.clubId, clubId), eq(clubSquads.id, squadId)));
        if (!squad) throw new Error("Elenco nao encontrado.");
        const linked = await transaction
          .select({ clubMemberId: clubSquadMembers.clubMemberId })
          .from(clubSquadMembers)
          .where(eq(clubSquadMembers.squadId, squadId));
        const linkedIds = new Set(linked.map((item) => item.clubMemberId));
        const toLink = [...byName.values()]
          .filter((member) => !linkedIds.has(member.id))
          .map((member) => ({ squadId, clubMemberId: member.id, role: "PLAYER" }));
        if (toLink.length) {
          await transaction.insert(clubSquadMembers).values(toLink);
        }
      }

      return { created, updated, skipped };
    });
  }

  async recordAudit(
    actorId: string,
    clubId: string,
    action: string,
    details: Record<string, unknown>
  ) {
    await this.db.insert(clubAuditLogs).values({ actorId, clubId, action, details });
  }

  async listAuditLogs(clubId: string) {
    return this.db
      .select()
      .from(clubAuditLogs)
      .where(eq(clubAuditLogs.clubId, clubId))
      .orderBy(asc(clubAuditLogs.createdAt));
  }

  private async withDetails(
    club: Omit<Club, "members" | "seasons" | "squads" | "staff">
  ): Promise<Club> {
    const [members, seasons, squads, staff] = await Promise.all([
      this.db
        .select()
        .from(clubMembers)
        .where(eq(clubMembers.clubId, club.id))
        .orderBy(asc(clubMembers.displayName)),
      this.db
        .select()
        .from(clubSeasons)
        .where(eq(clubSeasons.clubId, club.id))
        .orderBy(asc(clubSeasons.name)),
      this.db
        .select()
        .from(clubSquads)
        .where(eq(clubSquads.clubId, club.id))
        .orderBy(asc(clubSquads.name)),
      this.db
        .select()
        .from(clubStaff)
        .where(eq(clubStaff.clubId, club.id))
        .orderBy(asc(clubStaff.displayName))
    ]);
    const squadsWithMembers = await Promise.all(
      squads.map((squad) => this.withSquadMembers(this.db, squad))
    );
    return {
      ...club,
      members,
      seasons,
      squads: squadsWithMembers,
      staff
    };
  }

  private async withSquadMembers(
    db: Pick<Database, "select">,
    squad: Omit<ClubSquad, "members">
  ): Promise<ClubSquad> {
    const rows = await db
      .select({
        clubMemberId: clubSquadMembers.clubMemberId,
        role: clubSquadMembers.role
      })
      .from(clubSquadMembers)
      .where(eq(clubSquadMembers.squadId, squad.id))
      .orderBy(asc(clubSquadMembers.createdAt));
    return { ...squad, members: rows };
  }

  private normalize(name: string) {
    return name.trim().toLocaleLowerCase("pt-BR");
  }
}




