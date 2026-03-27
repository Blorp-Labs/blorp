import { test, expect } from "@playwright/test";
import {
  GET_POSTS_RES,
  GET_COMMUNITY_RES,
  GET_COMMUNITIES_RES,
} from "./lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

for (const { name, base } of tabs) {
  test.describe(`${name}-tab community page`, () => {
    test("posts load", async ({ page }) => {
      await mockNodeinfo(page, "lemmy");
      await page.route("**/api/v3/post/list*", (route) =>
        jsonRoute(route, GET_POSTS_RES),
      );
      await page.goto(`${base}c/asklemmy@lemmy.ml`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(
        "What TV shows are you watching and would recommend?",
      );
    });

    test("community info renders", async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes("Mobile");
      await mockNodeinfo(page, "lemmy");
      await page.route("**/api/v3/community*", (route) =>
        jsonRoute(route, GET_COMMUNITY_RES),
      );
      await page.goto(`${base}c/asklemmy@lemmy.ml`);
      if (isMobile) {
        // AggregateBadges renders "10k Subscribers" — only present when
        // community data was written to and read from the cache correctly
        await expect(page.getByText(/Subscribers/).first()).toBeVisible();
      } else {
        // CommunitySidebarInner returns null when data is absent, so the
        // slug is only visible when community data is in the store
        await expect(page.getByText("asklemmy@lemmy.ml").first()).toBeVisible();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Explore / communities listing page (/communities)
// ---------------------------------------------------------------------------

test("explore page loads communities", async ({ page }) => {
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/community/list*", (route) =>
    jsonRoute(route, GET_COMMUNITIES_RES),
  );
  await page.goto("/communities");
  const communityCard = page.getByTestId("community-card").first();
  await expect(communityCard).toBeVisible();
  await expect(communityCard).toContainText("asklemmy@lemmy.ml");
});
