import { test, expect } from "@playwright/test";

test("settings page", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("STORAGE")).toBeVisible();
});

test("support page", async ({ page }) => {
  await page.goto("/support");
  await expect(page.getByText("Need Help? We're Here for You!")).toBeVisible();
});

test("privacy policy page", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText("How We Use Your Information")).toBeVisible();
});
