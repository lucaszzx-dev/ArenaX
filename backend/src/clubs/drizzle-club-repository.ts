import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  championshipEntries,
  clubMembers,
  clubs,
  teamMembers,
  teams
} from "../db/schema.js";
import type {
  Club,
  ClubIdentity,
  ClubRepository
} from "./club-repository.js";

export class DrizzleClubRepository implements ClubRepository {
  constructor(private readonly db: Database) {}

  async listByOwner(ownerId: string) {
    const rows = await this.db
      .select()
      .from(clubs)
      .where(eq(clubs.ownerId, ownerId))
      .orderBy(asc(clubs.name));
    return Promise.all(rows.map((club) => this.withMembers(club)));
  }

  async findById(clubId: string) {
    const [club] = await this.db.select().from(clubs).where(eq(clubs.id, clubId));
    return club ? this.withMembers(club) : null;
  }

  async create(ownerId: string, input: ClubIdentity) {
    const [club] = await this.db.insert(clubs).values({ ownerId, ...input }).returning();
    if (!club) throw new Error("Não foi possível criar o clube.");
    return { ...club, members: [] };
  }

  async update(clubId: string, input: ClubIdentity) {
    const [club] = await this.db
      .update(clubs)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(clubs.id, clubId))
      .returning();
    if (!club) throw new Error("Não foi possível atualizar o clube.");
    return this.withMembers(club);
  }

  async delete(clubId: string) {
    const rows = await this.db
      .delete(clubs)
      .where(eq(clubs.id, clubId))
      .returning({ id: clubs.id });
    return rows.length > 0;
  }

  async addMember(
    clubId: string,
    input: {
      displayName: string;
      jerseyNumber: number | null;
      position: string | null;
    }
  ) {
    const [member] = await this.db
      .insert(clubMembers)
      .values({ clubId, ...input })
      .returning();
    if (!member) throw new Error("Não foi possível adicionar o jogador.");
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
      if (!member) throw new Error("Jogador não encontrado.");
      const [club] = await transaction.select().from(clubs).where(eq(clubs.id, clubId));
      if (!club) throw new Error("Clube não encontrado.");
      return this.withMembers(club);
    });
  }

  async importIntoChampionship(club: Club, championshipId: string) {
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
      if (!team) throw new Error("Não foi possível importar o clube.");

      await transaction.insert(championshipEntries).values({
        championshipId,
        kind: "TEAM",
        displayName: club.name,
        teamId: team.id
      });

      if (club.members.length) {
        await transaction.insert(teamMembers).values(
          club.members.map((member) => ({
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

  private async withMembers(
    club: Omit<Club, "members">
  ): Promise<Club> {
    const members = await this.db
      .select()
      .from(clubMembers)
      .where(eq(clubMembers.clubId, club.id))
      .orderBy(asc(clubMembers.displayName));
    return { ...club, members };
  }
}
