import { type Championship } from "./championship-api";

export type DashboardStats = {
  total: number;
  draft: number;
  published: number;
  finished: number;
};

export type DashboardAlertAction = "publish" | "complete-data";

export type DashboardAlert = {
  label: string;
  action: DashboardAlertAction;
};

export function computeDashboardStats(
  championships: Championship[]
): DashboardStats {
  return {
    total: championships.length,
    draft: championships.filter((item) => item.status === "DRAFT").length,
    published: championships.filter((item) => item.status === "PUBLISHED").length,
    finished: championships.filter((item) => item.status === "FINISHED").length
  };
}

export function isChampionshipDataIncomplete(
  championship: Championship
): boolean {
  return !championship.description || !championship.startsAt;
}

export function dashboardAlert(championship: Championship): DashboardAlert | null {
  if (championship.status === "DRAFT") {
    return { label: "Publicar pendente", action: "publish" };
  }
  if (
    championship.status === "PUBLISHED" &&
    isChampionshipDataIncomplete(championship)
  ) {
    return { label: "Dados incompletos", action: "complete-data" };
  }
  return null;
}

export function dashboardAlertHref(championship: Championship): string | null {
  const alert = dashboardAlert(championship);
  if (!alert) return null;
  const base = `/painel/campeonatos/${championship.id}`;
  return alert.action === "publish" ? base : `${base}/editar`;
}
