import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "./auth-api";

export const currentUserQueryKey = ["current-user"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    retry: 1,
    retryDelay: 1_000
  });
}
