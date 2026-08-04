import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as any).__copiedText = text;
        }
      },
      configurable: true
    });
  });
});

test("visitor sees calendar grouped and sections on the public championship page", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");

  await expect(page.getByRole("heading", { name: "Copa ArenaX Demo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Partidas e resultados" })).toBeVisible();

  // Open the full calendar to see filters
  await page.getByRole("button", { name: "Ver calendário completo" }).click();
  await expect(page.getByLabel("Filtrar por estado")).toBeVisible();
  await expect(page.getByLabel("Filtrar por rodada")).toBeVisible();
  // Check for round grouping (Sem rodada or Rodada X)
  await expect(page.locator("summary strong").first()).toBeVisible();
});

test("calendar filters update the URL without dropping other params", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");
  await expect(page.getByRole("heading", { name: "Partidas e resultados" })).toBeVisible();

  // Open the full calendar to access filters
  await page.getByRole("button", { name: "Ver calendário completo" }).click();
  await page.getByLabel("Filtrar por estado").selectOption("FINISHED");
  await expect(page).toHaveURL(/status=FINISHED/);

  await page.getByLabel("Filtrar por rodada").selectOption("sem-rodada");
  await expect(page).toHaveURL(/status=FINISHED/);
  await expect(page).toHaveURL(/round=sem-rodada/);
  await expect(page.getByRole("link", { name: /Raios Azuis/ }).first()).toBeVisible();
});

test("visitor favorites a championship and it persists in localStorage", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");
  const favButton = page.getByRole("button", { name: /Favoritar|Favorita/ });
  await expect(favButton).toBeVisible();

  await favButton.click();
  await expect(favButton).toHaveAttribute("aria-pressed", "true");

  const stored = await page.evaluate(() => localStorage.getItem("arenax:favorites"));
  expect(stored).toContain("copa-arenax-demo");

  await page.reload();
  await expect(page.getByRole("button", { name: /Favorita/ })).toHaveAttribute("aria-pressed", "true");
});

test("visitor shares a championship by copying the link", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");
  const shareButton = page.getByRole("button", { name: /Compartilhar/ });
  await expect(shareButton).toBeVisible();
  await shareButton.click();
  await expect(page.getByText("Link copiado!")).toBeVisible();
  const copied = await page.evaluate(() => (window as any).__copiedText);
  expect(copied).toContain("/campeonatos/copa-arenax-demo");
});

test("explore page filters to favorites via the toggle", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("arenax:favorites", JSON.stringify(["copa-arenax-demo"]));
  });
  await page.goto("/campeonatos");
  const toggle = page.getByRole("button", { name: /Favoritas/ });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page).toHaveURL(/favorites=1/);
  await expect(page.getByRole("link", { name: /Copa ArenaX Demo/ })).toBeVisible();
});

test("visitor opens a finished match page and sees score and events", async ({ page }) => {
  await page.goto("/campeonatos/copa-arenax-demo");
  await page.getByRole("link", { name: /Raios Azuis.*3.*1/ }).first().click();
  await expect(page.getByText("resultado final")).toBeVisible();
  // On the public match page, the "Resumo" tab (role=tab) is always available
  await expect(page.getByRole("tab", { name: "Resumo" })).toBeVisible();
});
