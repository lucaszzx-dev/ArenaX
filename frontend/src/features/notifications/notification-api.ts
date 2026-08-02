import { apiRequest } from "../../lib/api";

export type NotificationType =
  | "MATCH_UPCOMING"
  | "MATCH_SCHEDULE_CHANGED"
  | "MATCH_RESULT"
  | "SQUAD_UPDATED"
  | "KNOCKOUT_ADVANCE";

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  dedupKey: string | null;
  createdAt: string;
};

export type NotificationPage = {
  notifications: AppNotification[];
  total: number;
  page: number;
  limit: number;
  unread: number;
};

export const listNotifications = (page = 1, limit = 20) =>
  apiRequest<NotificationPage>(
    `/notifications?page=${page}&limit=${limit}`
  );

export const getUnreadCount = () =>
  apiRequest<{ unread: number }>("/notifications/unread-count");

export const markNotificationRead = (notificationId: string) =>
  apiRequest<{ notification: AppNotification }>(
    `/notifications/${notificationId}/read`,
    { method: "PUT" }
  );

export const markAllNotificationsRead = () =>
  apiRequest<{ updated: number }>("/notifications/read-all", {
    method: "PUT"
  });
