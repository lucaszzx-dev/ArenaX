import type {
  NewNotification,
  Notification,
  NotificationRepository,
  UpcomingMatchRow
} from "../../src/notifications/notification-repository.js";

export class InMemoryNotificationRepository
  implements NotificationRepository
{
  readonly notifications: Notification[] = [];
  readonly entryUsers: Map<string, string[]> = new Map();
  readonly teamMemberUsers: Map<string, string[]> = new Map();
  upcomingMatches: UpcomingMatchRow[] = [];

  async createMany(rows: NewNotification[]) {
    for (const row of rows) {
      const exists = this.notifications.some(
        (item) => item.userId === row.userId && item.dedupKey === row.dedupKey
      );
      if (exists) continue;
      const now = new Date();
      this.notifications.push({
        id: crypto.randomUUID(),
        userId: row.userId,
        type: row.type,
        title: row.title,
        message: row.message,
        link: row.link,
        readAt: row.readAt ?? null,
        dedupKey: row.dedupKey,
        createdAt: row.createdAt ?? now
      });
    }
  }

  async listByUser(userId: string, page: number, limit: number) {
    const owned = this.notifications
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = (page - 1) * limit;
    return {
      notifications: owned.slice(offset, offset + limit),
      total: owned.length,
      unread: owned.filter((item) => item.readAt === null).length
    };
  }

  async countUnread(userId: string) {
    return this.notifications.filter(
      (item) => item.userId === userId && item.readAt === null
    ).length;
  }

  async markRead(userId: string, notificationId: string) {
    const notification = this.notifications.find(
      (item) => item.id === notificationId && item.userId === userId
    );
    if (!notification) return null;
    notification.readAt = new Date();
    return notification;
  }

  async markAllRead(userId: string) {
    const targets = this.notifications.filter(
      (item) => item.userId === userId && item.readAt === null
    );
    for (const item of targets) item.readAt = new Date();
    return targets.length;
  }

  async findEntryUserIds(entryIds: string[]) {
    const result = new Set<string>();
    for (const entryId of entryIds) {
      for (const userId of this.entryUsers.get(entryId) ?? []) {
        result.add(userId);
      }
    }
    return [...result];
  }

  async findTeamMemberUserIds(teamId: string) {
    return [...(this.teamMemberUsers.get(teamId) ?? [])];
  }

  async listUpcomingMatches(start: Date, end: Date) {
    return this.upcomingMatches.filter(
      (row) => row.scheduledAt >= start && row.scheduledAt < end
    );
  }
}
