import { test, expect } from "@playwright/test";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

for (const { name, base } of tabs) {
  test.describe(`${name}‑tab tests`, () => {
    test("loads community feed", async ({ page }) => {
      await page.goto(`${base}c/asklemmy@lemmy.ml`);
      const postCard = page.getByTestId("post-card").first();
      // TODO: find something else to assert for here
      // We no longer render the community slug since you
      // already know you're in that community
      //await expect(postCard).toContainText("asklemmy@lemmy.ml");
    });

    test("loads user feed", async ({ page }) => {
      await page.goto(
        `${base}u/https%3A%2F%2Flemmy.world%2Fu%2FThe_Picard_Maneuver?type=posts`,
      );
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
    });

    test("loads search results", async ({ page }) => {
      await page.goto(`${base}s?q=linux+phone`);
      const postCard = page
        .getByTestId(base === "/communities/" ? "community-card" : "post-card")
        .first();
      await expect(postCard).toContainText("linux", {
        ignoreCase: true,
      });
    });

    test("loads community search results", async ({ page }) => {
      await page.goto(`${base}c/programmer_humor@programming.dev/s?q=linux`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toContainText("programmer_humor@programming.dev");
    });
  });
}
