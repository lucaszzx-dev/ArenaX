import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import {
  championshipEntries,
  teamMembers,
  teams
} from "../db/schema.js";
import type {
  IndividualParticipant,
  ParticipantRepository,
  Team,
  TeamMember
} from "./participant-repository.js";

export class DrizzleParticipantRepository implements ParticipantRepository {
  constructor(private readonly db: Database) {}

  async listIndividuals(championshipId: string): Promise<IndividualParticipant[]> {
    return this.db
      .select({
        id: championshipEntries.id,
        championshipId: championshipEntries.championshipId,
        displayName: championshipEntries.displayName,
        userId: championshipEntries.userId,
        createdAt: championshipEntries.createdAt
      })
      .from(championshipEntries)
      .where(and(
        eq(championshipEntries.championshipId, championshipId),
        eq(championshipEntries.kind, "INDIVIDUAL")
      ))
      .orderBy(asc(championshipEntries.displayName));
  }

  async createIndividual(championshipId: string, displayName: string) {
    const [participant] = await this.db
      .insert(championshipEntries)
      .values({ championshipId, kind: "INDIVIDUAL", displayName })
      .returning();

    if (!participant) throw new Error("Não foi possível cadastrar o participante.");

    return participant;
  }

  async deleteIndividual(championshipId: string, participantId: string) {
    const deleted = await this.db
      .delete(championshipEntries)
      .where(and(
        eq(championshipEntries.id, participantId),
        eq(championshipEntries.championshipId, championshipId),
        eq(championshipEntries.kind, "INDIVIDUAL")
      ))
      .returning({ id: championshipEntries.id });

    return deleted.length > 0;
  }

  async listTeams(championshipId: string): Promise<Team[]> {
    const teamRows = await this.db
      .select()
      .from(teams)
      .where(eq(teams.championshipId, championshipId))
      .orderBy(asc(teams.name));

    return Promise.all(teamRows.map((team) => this.withMembers(team)));
  }

  async findTeam(teamId: string): Promise<Team | null> {
    const [team] = await this.db.select().from(teams).where(eq(teams.id, teamId));
    return team ? this.withMembers(team) : null;
  }

  async createTeam(
    championshipId: string,
    name: string,
    shortName: string | null,
    logoUrl: string | null
  ): Promise<Team> {
    return this.db.transaction(async (transaction) => {
      const [team] = await transaction
        .insert(teams)
        .values({ championshipId, name, shortName, logoUrl })
        .returning();

      if (!team) throw new Error("Não foi possível cadastrar a equipe.");

      await transaction.insert(championshipEntries).values({
        championshipId,
        kind: "TEAM",
        displayName: name,
        teamId: team.id
      });

      return { ...team, members: [] };
    });
  }

  async updateTeamIdentity(
    teamId: string,
    input: { name: string; shortName: string | null; logoUrl: string | null }
  ) {
    return this.db.transaction(async (transaction) => {
      const [team] = await transaction
        .update(teams)
        .set(input)
        .where(eq(teams.id, teamId))
        .returning();
      if (!team) throw new Error("Não foi possível atualizar a equipe.");
      await transaction
        .update(championshipEntries)
        .set({ displayName: input.name })
        .where(eq(championshipEntries.teamId, teamId));
      return this.withMembers(team);
    });
  }

  async setCaptain(teamId: string, memberId: string) {
    return this.db.transaction(async (transaction) => {
      await transaction
        .update(teamMembers)
        .set({ isCaptain: false })
        .where(eq(teamMembers.teamId, teamId));
      const [captain] = await transaction
        .update(teamMembers)
        .set({ isCaptain: true })
        .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))
        .returning();
      if (!captain) throw new Error("Jogador não encontrado.");
      const [team] = await transaction.select().from(teams).where(eq(teams.id, teamId));
      if (!team) throw new Error("Equipe não encontrada.");
      return this.withMembers(team);
    });
  }

  async deleteTeam(championshipId: string, teamId: string) {
    const deleted = await this.db
      .delete(teams)
      .where(and(eq(teams.id, teamId), eq(teams.championshipId, championshipId)))
      .returning({ id: teams.id });

    return deleted.length > 0;
  }

  async addTeamMember(
    teamId: string,
    displayName: string,
    jerseyNumber: number | null = null,
    position: string | null = null
  ): Promise<TeamMember> {
    const [member] = await this.db
      .insert(teamMembers)
      .values({ teamId, displayName, jerseyNumber, position })
      .returning();

    if (!member) throw new Error("Não foi possível cadastrar o jogador.");

    return member;
  }

  async deleteTeamMember(teamId: string, memberId: string) {
    const deleted = await this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))
      .returning({ id: teamMembers.id });

    return deleted.length > 0;
  }

  private async withMembers(
    team: Omit<Team, "members">
  ): Promise<Team> {
    const members = await this.db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id))
      .orderBy(asc(teamMembers.displayName));

    return { ...team, members };
  }
}
