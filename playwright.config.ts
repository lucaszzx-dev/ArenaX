import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ],
  webServer: [
    {
      command: "pnpm --dir backend build && pnpm --dir backend start",
      url: "http://localhost:3333/health",
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: "pnpm --dir frontend dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000
    }
  ]
});
