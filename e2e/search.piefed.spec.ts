import { test, expect } from "@playwright/test";
import { mockNodeinfo, jsonRoute } from "./test-utils";
import { SEARCH_RES } from "./piefed-api-fixtures";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

for (const { name, base } of tabs) {
  test.describe(`${name}-tab search`, () => {
    test("loads search results", async ({ page }) => {
      await mockNodeinfo(page);
      await page.route("**/api/alpha/search*", (route) =>
        jsonRoute(route, SEARCH_RES),
      );
      await page.goto(`${base}s?q=open+source`);
      const card = page
        .getByTestId(base === "/communities/" ? "community-card" : "post-card")
        .first();
      await expect(card).toContainText(
        base === "/communities/" ? "technology" : "open source",
        { ignoreCase: true },
      );
    });

    test("loads community search results", async ({ page }) => {
      await mockNodeinfo(page);
      await page.route("**/api/alpha/search*", (route) =>
        jsonRoute(route, SEARCH_RES),
      );
      await page.goto(`${base}c/technology@piefed.social/s?q=open+source`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toContainText("technology@piefed.social");
    });
  });
}
