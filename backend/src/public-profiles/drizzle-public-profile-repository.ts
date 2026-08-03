import type { Database } from "../db/client.js";
import {
  championshipEntries,
  championships,
  clubMembers,
  clubs,
  profiles,
  teamMembers,
  teams
} from "../db/schema.js";
import { and, asc, desc, eq } from "drizzle-orm";
import type {
  PublicClub,
  PublicClubParticipation,
  PublicMemberContext,
  PublicProfile,
  PublicProfileRepository
} from "./public-profile-repository.js";

export class DrizzlePublicProfileRepository
  implements PublicProfileRepository
{
  constructor(private readonly db: Database) {}

  async findMemberContext(memberId: string): Promise<PublicMemberContext | null> {
    const [row] = await this.db
      .select({
        memberId: teamMembers.id,
        displayName: teamMembers.displayName,
        teamId: teams.id,
        teamName: teams.name,
        teamShortName: teams.shortName,
        teamLogoUrl: teams.logoUrl,
        championshipId: championships.id,
        championshipName: championships.name,
        championshipSlug: championships.slug,
        championshipSport: championships.sport,
        championshipStatus: championships.status,
        entryId: championshipEntries.id
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .innerJoin(
        championshipEntries,
        and(
          eq(championshipEntries.teamId, teams.id),
          eq(championshipEntries.kind, "TEAM")
        )
      )
      .innerJoin(championships, eq(championships.id, teams.championshipId))
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    return (row as PublicMemberContext | undefined) ?? null;
  }

  async findProfile(userId: string): Promise<PublicProfile | null> {
    const [row] = await this.db
      .select({
        userId: profiles.userId,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    return row ?? null;
  }

  async findClub(clubId: string): Promise<PublicClub | null> {
    const [club] = await this.db
      .select({
        id: clubs.id,
        name: clubs.name,
        shortName: clubs.shortName,
        logoUrl: clubs.logoUrl
      })
      .from(clubs)
      .where(eq(clubs.id, clubId))
      .limit(1);
    if (!club) return null;

    const members = await this.db
      .select({
        id: clubMembers.id,
        displayName: clubMembers.displayName,
        jerseyNumber: clubMembers.jerseyNumber,
        position: clubMembers.position,
        isCaptain: clubMembers.isCaptain
      })
      .from(clubMembers)
      .where(eq(clubMembers.clubId, clubId))
      .orderBy(asc(clubMembers.displayName));

    return { ...club, members };
  }

  async listClubsByOwner(ownerId: string) {
    return this.db
      .select({
        id: clubs.id,
        name: clubs.name,
        shortName: clubs.shortName,
        logoUrl: clubs.logoUrl
      })
      .from(clubs)
      .where(eq(clubs.ownerId, ownerId))
      .orderBy(asc(clubs.name));
  }

  async listClubParticipations(
    clubId: string
  ): Promise<PublicClubParticipation[]> {
    const rows = await this.db
      .select({
        championshipId: championships.id,
        championshipName: championships.name,
        championshipSlug: championships.slug,
        championshipSport: championships.sport,
        championshipStatus: championships.status,
        teamId: teams.id,
        teamName: teams.name,
        teamLogoUrl: teams.logoUrl
      })
      .from(teams)
      .innerJoin(championships, eq(championships.id, teams.championshipId))
      .where(eq(teams.sourceClubId, clubId))
      .orderBy(desc(championships.createdAt));

    return rows;
  }
}


