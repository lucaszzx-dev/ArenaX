import { expect, test } from "@playwright/test";

test("keeps passwords hidden by default and lets the user reveal them", async ({ page }) => {
  await page.goto("/entrar");
  const password = page.locator('input[name="password"]');
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("starts password recovery with a neutral response", async ({ page }) => {
  await page.goto("/esqueci-minha-senha");
  await page.getByLabel("E-mail").fill("nao-existe@arenax.test");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page.getByRole("alert")).toContainText("Se existir uma conta");
  await expect(page.getByLabel("Código")).toBeVisible();
});
