import { test, expect } from "@playwright/test";
import {
  GET_POSTS_RES,
  GET_COMMUNITY_RES,
  GET_COMMUNITIES_RES,
} from "./lemmy-api-fixtures";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

for (const { name, base } of tabs) {
  test.describe(`${name}-tab community page`, () => {
    test("posts load", async ({ page }) => {
      await page.route("**/api/v3/post/list*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GET_POSTS_RES),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        });
      });
      await page.goto(`${base}c/asklemmy@lemmy.ml`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(
        "What TV shows are you watching and would recommend?",
      );
    });

    test("community info renders", async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes("Mobile");
      await page.route("**/api/v3/community*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GET_COMMUNITY_RES),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        });
      });
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
  await page.route("**/api/v3/community/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_COMMUNITIES_RES),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });
  await page.goto("/communities");
  const communityCard = page.getByTestId("community-card").first();
  await expect(communityCard).toBeVisible();
  await expect(communityCard).toContainText("asklemmy@lemmy.ml");
});
