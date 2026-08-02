import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "../db/client.js";
import {
  championshipEntries,
  championships,
  matches,
  notifications,
  teamMembers
} from "../db/schema.js";
import type {
  NewNotification,
  Notification,
  NotificationRepository,
  NotificationType
} from "./notification-repository.js";

const awayEntries = alias(championshipEntries, "away_entries");

export class DrizzleNotificationRepository
  implements NotificationRepository
{
  constructor(private readonly db: Database) {}

  async createMany(rows: NewNotification[]) {
    if (!rows.length) return;
    await this.db
      .insert(notifications)
      .values(rows.map((row) => ({
        userId: row.userId,
        type: row.type,
        title: row.title,
        message: row.message,
        link: row.link,
        dedupKey: row.dedupKey,
        readAt: row.readAt ?? null,
        createdAt: row.createdAt ?? new Date()
      })))
      .onConflictDoNothing({
        target: [notifications.userId, notifications.dedupKey]
      });
  }

  async listByUser(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [rows, totalRows, unreadRows] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<string>`count(*)::int` })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
      this.db
        .select({ count: sql<string>`count(*)::int` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          sql`${notifications.readAt} is null`
        ))
    ]);

    return {
      notifications: rows.map((row) => toNotification(row)),
      total: Number(totalRows[0]?.count ?? 0),
      unread: Number(unreadRows[0]?.count ?? 0)
    };
  }

  async countUnread(userId: string) {
    const [row] = await this.db
      .select({ count: sql<string>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        sql`${notifications.readAt} is null`
      ));
    return Number(row?.count ?? 0);
  }

  async markRead(userId: string, notificationId: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();
    return row ? toNotification(row) : null;
  }

  async markAllRead(userId: string) {
    const rows = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        sql`${notifications.readAt} is null`
      ))
      .returning({ id: notifications.id });
    return rows.length;
  }

  async findEntryUserIds(entryIds: string[]) {
    if (!entryIds.length) return [];
    const individual = await this.db
      .select({ userId: championshipEntries.userId })
      .from(championshipEntries)
      .where(and(
        inArray(championshipEntries.id, entryIds),
        isNotNull(championshipEntries.userId)
      ));
    const teamRows = await this.db
      .select({ teamId: championshipEntries.teamId })
      .from(championshipEntries)
      .where(and(
        inArray(championshipEntries.id, entryIds),
        isNotNull(championshipEntries.teamId)
      ));
    const teamIds = teamRows
      .map((row) => row.teamId)
      .filter((id): id is string => id !== null);
    const members = teamIds.length
      ? await this.db
          .select({ userId: teamMembers.userId })
          .from(teamMembers)
          .where(and(
            inArray(teamMembers.teamId, teamIds),
            isNotNull(teamMembers.userId)
          ))
      : [];

    return [...individual, ...members]
      .map((row) => row.userId)
      .filter((id): id is string => id !== null);
  }

  async findTeamMemberUserIds(teamId: string) {
    const rows = await this.db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), isNotNull(teamMembers.userId)));
    return rows
      .map((row) => row.userId)
      .filter((id): id is string => id !== null);
  }

  async listUpcomingMatches(start: Date, end: Date) {
    const rows = await this.db
      .select({
        matchId: matches.id,
        championshipId: matches.championshipId,
        homeEntryId: matches.homeEntryId,
        awayEntryId: matches.awayEntryId,
        scheduledAt: matches.scheduledAt,
        homeDisplayName: championshipEntries.displayName,
        awayDisplayName: awayEntries.displayName,
        championshipName: championships.name,
        championshipSlug: championships.slug
      })
      .from(matches)
      .innerJoin(championships, eq(championships.id, matches.championshipId))
      .innerJoin(
        championshipEntries,
        eq(championshipEntries.id, matches.homeEntryId)
      )
      .innerJoin(awayEntries, eq(awayEntries.id, matches.awayEntryId))
      .where(and(
        eq(matches.status, "SCHEDULED"),
        sql`${matches.scheduledAt} >= ${start} and ${matches.scheduledAt} < ${end}`
      ));
    return rows.filter(
      (row): row is typeof row & { scheduledAt: Date } =>
        row.scheduledAt !== null
    );
  }
}

function toNotification(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: Date | null;
  dedupKey: string | null;
  createdAt: Date;
}): Notification {
  return {
    ...row,
    type: row.type as NotificationType
  };
}
