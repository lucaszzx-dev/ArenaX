import { expect, test } from "@playwright/test";

test("visitor discovers a published arena by sport", async ({ page }) => {
  await page.goto("/campeonatos");

  await expect(page.getByRole("heading", {
    name: "Encontre o próximo campeonato."
  })).toBeVisible();
  await page.getByLabel("Esporte").selectOption("Futsal");
  await page.getByRole("button", { name: "Buscar competições" }).click();

  const arena = page.getByRole("link", { name: /Copa ArenaX Demo/ });
  await expect(arena).toBeVisible();
  await arena.click();
  await expect(page.getByRole("heading", { name: "Copa ArenaX Demo" })).toBeVisible();
});

test("visitor follows the public arena and match result", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");

  await expect(page.getByRole("heading", { name: "Copa ArenaX Demo" })).toBeVisible();
  await expect(page.getByText("4 inscritos")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tabela geral" })).toBeVisible();

  await page.getByRole("link", { name: /Raios Azuis.*3.*1.*Fênix Urbana/ }).first().click();
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

test("organizer records a football event for a player", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@arenax.local");
  await page.getByLabel("Senha").fill("ArenaXDemo2026!");
  await page.getByRole("button", { name: "Entrar na ArenaX" }).click();

  await page.getByRole("link", { name: /Copa ArenaX Demo/ }).click();
  await page.getByRole("link", { name: "Gerenciar partidas" }).click();

  // Click "Administrar" on the third match (Raios Azuis vs Vila Norte - SCHEDULED)
  await page.getByRole("link", { name: "Administrar" }).nth(2).click();

  // Wait for AdminMatchPage to load
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });
  
  // Navigate to "Eventos" tab
  await page.getByRole("button", { name: "Eventos" }).click();

  // Wait for the "Eventos da partida" heading
  await expect(page.getByRole("heading", { name: "Eventos da partida" })).toBeVisible({ timeout: 10000 });

  // Verify the event form is visible with correct team members
  await expect(page.getByLabel("Evento")).toBeVisible();
  await expect(page.getByLabel("Jogador")).toBeVisible();
  await expect(page.getByLabel("Tempo")).toBeVisible();
  await expect(page.getByLabel("Minuto")).toBeVisible();
  await expect(page.getByRole("button", { name: /Adicionar|Registrando/ })).toBeVisible();

  // Now add event
  await page.getByLabel("Evento").selectOption("GOAL");
  await page.getByLabel("Jogador").selectOption({ label: "Jogador 1" });
  await page.getByLabel("Tempo").selectOption("1");
  await page.getByLabel("Minuto").fill("12");
  await page.getByRole("button", { name: /Adicionar|Registrando/ }).click();

  // Verify event was added - wait for success toast or event row
  await expect(page.getByText("Evento registrado")).toBeVisible({ timeout: 10000 });
});
