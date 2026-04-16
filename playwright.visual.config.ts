import { defineConfig, devices } from "@playwright/test";

const STORYBOOK_PORT = 6006;

export default defineConfig({
  testDir: "./visual",
  snapshotDir: "./visual-snapshots",
  snapshotPathTemplate: "{snapshotDir}/{platform}/{arg}{ext}",
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
        launchOptions: {
          args: [
            // Disable subpixel text rendering — the main source of
            // cross-platform font differences between macOS and Linux.
            "--disable-lcd-text",
            "--disable-font-subpixel-positioning",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "pnpm storybook",
    url: `http://localhost:${STORYBOOK_PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
