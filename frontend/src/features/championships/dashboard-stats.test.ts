import { describe, expect, it } from "vitest";

import { type Championship } from "./championship-api";
import {
  computeDashboardStats,
  dashboardAlert,
  dashboardAlertHref,
  isChampionshipDataIncomplete
} from "./dashboard-stats";

function championship(
  overrides: Partial<Championship> = {}
): Championship {
  return {
    id: "arena-1",
    organizerId: "owner-1",
    name: "Liga do Bairro",
    slug: "liga-do-bairro",
    sport: "Futsal",
    description: "Primeira edição",
    entryType: "TEAM",
    status: "DRAFT",
    format: "LEAGUE",
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowsDraw: true,
    bestOfSets: 5,
    thirdPlace: true,
    maxYellowCards: 0,
    startsAt: "2026-08-01T12:00:00.000Z",
    endsAt: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides
  };
}

describe("computeDashboardStats", () => {
  it("counts championships by status", () => {
    const stats = computeDashboardStats([
      championship({ id: "1", status: "DRAFT" }),
      championship({ id: "2", status: "PUBLISHED" }),
      championship({ id: "3", status: "PUBLISHED" }),
      championship({ id: "4", status: "FINISHED" })
    ]);

    expect(stats).toEqual({ total: 4, draft: 1, published: 2, finished: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(computeDashboardStats([])).toEqual({
      total: 0,
      draft: 0,
      published: 0,
      finished: 0
    });
  });
});

describe("isChampionshipDataIncomplete", () => {
  it("flags missing description or start date", () => {
    expect(
      isChampionshipDataIncomplete(championship({ description: null }))
    ).toBe(true);
    expect(
      isChampionshipDataIncomplete(championship({ startsAt: null }))
    ).toBe(true);
    expect(
      isChampionshipDataIncomplete(championship({}))
    ).toBe(false);
  });
});

describe("dashboardAlert", () => {
  it("alerts pending publish for drafts with publish action", () => {
    expect(dashboardAlert(championship({ status: "DRAFT" }))).toEqual({
      label: "Publicar pendente",
      action: "publish"
    });
  });

  it("alerts incomplete data only for published arenas", () => {
    expect(
      dashboardAlert(championship({ status: "PUBLISHED", description: null }))
    ).toEqual({ label: "Dados incompletos", action: "complete-data" });
    expect(
      dashboardAlert(championship({ status: "DRAFT", description: null }))
    ).toEqual({ label: "Publicar pendente", action: "publish" });
    expect(
      dashboardAlert(championship({ status: "FINISHED", description: null }))
    ).toBeNull();
  });

  it("returns null for published arenas with complete data", () => {
    expect(dashboardAlert(championship({ status: "PUBLISHED" }))).toBeNull();
  });
});

describe("dashboardAlertHref", () => {
  it("points the publish alert to the organizer page", () => {
    expect(
      dashboardAlertHref(championship({ status: "DRAFT" }))
    ).toBe("/painel/campeonatos/arena-1");
  });

  it("points the incomplete-data alert to the edit page", () => {
    expect(
      dashboardAlertHref(championship({ status: "PUBLISHED", description: null }))
    ).toBe("/painel/campeonatos/arena-1/editar");
  });

  it("returns null when there is no alert", () => {
    expect(dashboardAlertHref(championship({ status: "FINISHED" }))).toBeNull();
  });
});
