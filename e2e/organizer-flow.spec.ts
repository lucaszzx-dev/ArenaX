import { expect, test } from "@playwright/test";
import { loginAsSeedOrganizer } from "./auth-helper.js";

async function login(page: import("@playwright/test").Page) {
  await loginAsSeedOrganizer(page);
}

async function createArena(
  page: import("@playwright/test").Page,
  name: string,
  format: "LEAGUE" | "KNOCKOUT"
) {
  await page.getByRole("link", { name: "Nova competição" }).click();
  await expect(page.getByRole("heading", { name: "Prepare o palco da competição." })).toBeVisible();
  await page.getByLabel("Nome da competição").fill(name);
  await page.getByLabel("Esporte").selectOption("Futsal");
  await page.getByLabel("Formato").selectOption(format);
  await page.getByRole("button", { name: "Criar competição em rascunho" }).click();
  await expect(page).toHaveURL(/\/painel\/campeonatos\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function addTeams(
  page: import("@playwright/test").Page,
  teams: string[]
) {
  for (const team of teams) {
    await page.getByLabel("Nome da equipe").fill(team);
    await page.getByRole("button", { name: "Criar equipe" }).click();
    await expect(page.getByText(team, { exact: true }).first()).toBeVisible();
  }
}

test("organizer creates a league competition, adds teams, generates rounds and records a score", async ({ page }) => {
  await login(page);

  const name = `Liga E2E ${Date.now()}`;
  await createArena(page, name, "LEAGUE");

  await page.getByRole("link", { name: "Gerenciar participantes" }).click();
  await expect(page).toHaveURL(/\/painel\/campeonatos\/.+\/participantes/);
  await addTeams(page, ["Leões E2E", "Tubarões E2E", "Águias E2E", "Panteras E2E"]);

  await page.getByRole("link", { name: "Voltar à competição" }).click();
  await expect(page.getByRole("link", { name: "Gerenciar partidas" })).toBeVisible();
  await page.getByRole("link", { name: "Gerenciar partidas" }).click();
  await expect(page).toHaveURL(/\/painel\/campeonatos\/.+\/partidas/);

  await page.getByRole("button", { name: "Gerar todas as rodadas" }).click();
  await expect(page.getByText("6 partidas", { exact: true })).toBeVisible();

  const firstScoreForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Finalizar", exact: true })
  }).first();
  await expect(firstScoreForm).toBeVisible();
  await firstScoreForm.locator("input[name=homeScore]").fill("3");
  await firstScoreForm.locator("input[name=awayScore]").fill("1");
  await firstScoreForm.getByRole("button", { name: "Finalizar", exact: true }).click();

  await expect(page.getByText("3 : 1").first()).toBeVisible();
  await expect(page.getByText("Finalizada", { exact: true }).first()).toBeVisible();
});
