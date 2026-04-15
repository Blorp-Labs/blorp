import { defineConfig, devices } from "@playwright/test";

const STORYBOOK_PORT = 6006;

export default defineConfig({
  testDir: "./visual",
  snapshotDir: "./visual-snapshots",
  snapshotPathTemplate: "{snapshotDir}/{arg}{ext}",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  workers: 1,
  reporter: process.env["CI"] ? "list" : "html",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 600, height: 600 },
      },
    },
  ],
  // Locally: auto-start Storybook if not already running.
  // In CI: the workflow starts the server before running this config.
  webServer: process.env["CI"]
    ? undefined
    : {
        command: "pnpm storybook",
        url: `http://localhost:${STORYBOOK_PORT}`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
