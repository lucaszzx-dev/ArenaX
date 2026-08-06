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

test("organizer creates a knockout competition, generates the bracket and advances a result", async ({ page }) => {
  await login(page);

  const name = `Mata-mata E2E ${Date.now()}`;
  await createArena(page, name, "KNOCKOUT");

  await page.getByRole("link", { name: "Gerenciar participantes" }).click();
  await expect(page).toHaveURL(/\/painel\/campeonatos\/.+\/participantes/);
  await addTeams(page, ["Leões E2E", "Tubarões E2E", "Águias E2E", "Panteras E2E"]);

  await page.getByRole("link", { name: "Voltar à competição" }).click();
  await expect(page.getByRole("link", { name: "Gerenciar partidas" })).toBeVisible();
  await page.getByRole("link", { name: "Gerenciar partidas" }).click();
  await expect(page).toHaveURL(/\/painel\/campeonatos\/.+\/partidas/);

  await page.getByRole("button", { name: "Gerar chaveamento" }).click();
  await expect(page.getByText(/Chaveamento criado com 3 fases e 0 folgas\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quartas de final" })).toBeVisible();
  // Check for team name in bracket article
  await expect(page.locator("article span").filter({ hasText: "Leões E2E" })).toBeVisible();

  const firstScoreForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Finalizar", exact: true })
  }).first();
  await expect(firstScoreForm).toBeVisible();
  await firstScoreForm.locator("input[name=homeScore]").fill("2");
  await firstScoreForm.locator("input[name=awayScore]").fill("0");
  await firstScoreForm.getByRole("button", { name: "Finalizar", exact: true }).click();

  await expect(page.getByText("2 : 0").first()).toBeVisible();
  await expect(page.getByText("Finalizada", { exact: true }).first()).toBeVisible();

  // Publica a competição e confere o chaveamento na página pública.
  await page.getByRole("link", { name: "Voltar à competição" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publicar competição" }).click();
  await expect(page.getByText("Status da competição atualizado.")).toBeVisible();

  const publicLink = page.getByRole("link", { name: /Abrir página pública/ });
  const [publicPage] = await Promise.all([
    page.waitForEvent("popup"),
    publicLink.click()
  ]);
  await publicPage.waitForLoadState();
  await expect(publicPage).toHaveURL(/\/campeonatos\/.+/);
  await expect(publicPage.getByRole("heading", { name })).toBeVisible();
  await expect(publicPage.getByRole("heading", { name: "Quartas de final" })).toBeVisible();
  const firstGame = publicPage.locator("article").filter({
    hasText: "Leões E2E"
  }).first();
  await expect(firstGame.getByText("2", { exact: true })).toBeVisible();
  await expect(firstGame.getByText("0", { exact: true })).toBeVisible();
});
