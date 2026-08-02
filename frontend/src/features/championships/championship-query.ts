import { useQuery } from "@tanstack/react-query";

import { listChampionships } from "./championship-api";

export const championshipListQueryKey = ["championships", "mine"] as const;
export const championshipDetailQueryKey = (id: string) =>
  ["championships", "detail", id] as const;

export function useChampionships() {
  return useQuery({
    queryKey: championshipListQueryKey,
    queryFn: listChampionships
  });
}
