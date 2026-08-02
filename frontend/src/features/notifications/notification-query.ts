import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "./notification-api";

export const notificationsQueryKey = (page = 1, limit = 20) => [
  "notifications",
  { page, limit }
] as const;
export const unreadCountQueryKey = ["notifications", "unread-count"] as const;

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: notificationsQueryKey(page, limit),
    queryFn: () => listNotifications(page, limit),
    placeholderData: (previous) => previous
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: getUnreadCount,
    refetchInterval: 60_000
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    }
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    }
  });
}
