export type NotificationType =
  | "MATCH_UPCOMING"
  | "MATCH_SCHEDULE_CHANGED"
  | "MATCH_RESULT"
  | "SQUAD_UPDATED"
  | "KNOCKOUT_ADVANCE";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  readAt: Date | null;
  dedupKey: string | null;
  createdAt: Date;
};

export type NewNotification = Omit<
  Notification,
  "id" | "readAt" | "createdAt"
> & { readAt?: Date | null; createdAt?: Date };

export type NotificationPage = {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  unread: number;
};

export type UpcomingMatchRow = {
  matchId: string;
  championshipId: string;
  homeEntryId: string;
  awayEntryId: string;
  scheduledAt: Date;
  homeDisplayName: string;
  awayDisplayName: string;
  championshipName: string;
  championshipSlug: string;
};

export interface NotificationRepository {
  createMany(rows: NewNotification[]): Promise<void>;
  listByUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ notifications: Notification[]; total: number; unread: number }>;
  countUnread(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
  findEntryUserIds(entryIds: string[]): Promise<string[]>;
  findTeamMemberUserIds(teamId: string): Promise<string[]>;
  listUpcomingMatches(start: Date, end: Date): Promise<UpcomingMatchRow[]>;
}
