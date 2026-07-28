import { expect, test } from "@playwright/test";

test("visitor follows the public arena and match result", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");

  await expect(page.getByRole("heading", { name: "Copa ArenaX Demo" })).toBeVisible();
  await expect(page.getByText("4 inscritos")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tabela geral" })).toBeVisible();

  await page.getByRole("link", { name: /Raios Azuis.*3.*1.*Fênix Urbana/ }).click();
  await expect(page.getByText("resultado final")).toBeVisible();
  await expect(page.getByText("Raios Azuis")).toBeVisible();
  await expect(page.getByText("Fênix Urbana")).toBeVisible();
});

test("organizer signs in and opens the demo arena panel", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@arenax.local");
  await page.getByLabel("Senha").fill("ArenaXDemo2026!");
  await page.getByRole("button", { name: "Entrar na ArenaX" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", {
    name: "Olá, Organizador ArenaX."
  })).toBeVisible();

  await page.getByRole("link", { name: /Copa ArenaX Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Copa ArenaX Demo" })).toBeVisible();
  await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Gerenciar partidas" })).toBeVisible();
});
