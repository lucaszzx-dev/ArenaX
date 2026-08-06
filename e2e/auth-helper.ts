import { expect, type Page } from "@playwright/test";

import { E2E_BACKEND_URL } from "./e2e-env.js";

const email = "demo@arenax.local";
const password = "ArenaXDemo2026!";

export async function loginAsSeedOrganizer(page: Page): Promise<void> {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.locator('input[name="password"]').fill(password);

  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    response.url() === `${E2E_BACKEND_URL}/api/auth/login`
  );
  await page.getByRole("button", { name: "Entrar na ArenaX" }).click();
  const response = await loginResponse;
  const body = await response.json() as { requiresVerification?: boolean };

  if (response.status() === 202 && body.requiresVerification) {
    const codeResponse = await page.request.post(
      `${E2E_BACKEND_URL}/api/auth/development/login-code`,
      { data: { email } }
    );
    expect(codeResponse.ok()).toBe(true);
    const { code } = await codeResponse.json() as { code: string };
    const verificationForm = page.locator("form").filter({
      has: page.locator('input[name="code"]')
    });
    await verificationForm.locator('input[name="code"]').fill(code);
    await verificationForm.locator('button[type="submit"]').click();
  } else {
    expect(response.ok()).toBe(true);
  }

  await expect(page).toHaveURL(/\/painel$/);
}
