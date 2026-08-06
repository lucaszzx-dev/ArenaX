import { expect, type Page } from "@playwright/test";

import { E2E_BACKEND_URL } from "./e2e-env.js";

const email = "demo@arenax.local";
const password = "ArenaXDemo2026!";

export async function loginAsSeedOrganizer(page: Page): Promise<void> {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar na ArenaX" }).click();

  const confirmation = page.getByRole("heading", {
    name: "Precisamos confirmar que é você"
  });
  const requiresVerification = await Promise.race([
    page.waitForURL(/\/painel$/, { timeout: 10_000 }).then(() => false).catch(() => false),
    confirmation.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)
  ]);

  if (requiresVerification) {
    const response = await page.request.post(
      `${E2E_BACKEND_URL}/api/auth/development/login-code`,
      { data: { email } }
    );
    expect(response.ok()).toBe(true);
    const { code } = await response.json() as { code: string };
    await page.getByLabel("Código de confirmação").fill(code);
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  }

  await expect(page).toHaveURL(/\/painel$/);
}
