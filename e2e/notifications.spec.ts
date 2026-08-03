import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

test.beforeAll(() => {
  // Cada projeto roda a suíte de forma isolada; o seed global só roda uma vez
  // e o projeto anterior marca as notificações como lidas.
  const distSeed = path.join(process.cwd(), "backend", "dist", "db", "seed.js");
  const command = existsSync(distSeed)
    ? `node "${distSeed}"`
    : "pnpm --dir backend run db:seed";
  execSync(command, {
    cwd: existsSync(distSeed)
      ? path.join(process.cwd(), "backend")
      : process.cwd(),
    stdio: "inherit"
  });
});

test("organizer opens the notification center and marks everything as read", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@arenax.local");
  await page.getByLabel("Senha").fill("ArenaXDemo2026!");
  await page.getByRole("button", { name: "Entrar na ArenaX" }).click();

  await expect(page).toHaveURL(/\/painel$/);

  const bell = page.getByRole("link", { name: /Notificações/ }).first();
  await expect(bell).toBeVisible();
  await bell.click();

  await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible();
  await expect(page.getByText("Resultado registrado").first()).toBeVisible();
  await expect(page.getByText(/Raios Azuis venceu Fênix Urbana/).first()).toBeVisible();

  await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(page.getByText("Tudo lido")).toBeVisible();
});
