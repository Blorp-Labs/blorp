import { test, expect } from "@playwright/test";
import { mockNodeinfo, jsonRoute } from "./test-utils";
import {
  GET_FEED_POSTS_RES,
  GET_COMMUNITY_RES,
  LIST_COMMUNITIES_RES,
} from "./piefed-api-fixtures";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

const COMMUNITY_SLUG = "technology@piefed.social";

for (const { name, base } of tabs) {
  test.describe(`${name}-tab community page`, () => {
    test("posts load", async ({ page }) => {
      await mockNodeinfo(page, "piefed");
      await page.route("**/api/alpha/post/list*", (route) =>
        jsonRoute(route, GET_FEED_POSTS_RES),
      );
      await page.goto(`${base}c/${COMMUNITY_SLUG}`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(
        "Exciting new developments in open source software",
      );
    });

    test("community info renders", async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes("Mobile");
      await mockNodeinfo(page, "piefed");
      await page.route("**/api/alpha/community*", (route) =>
        jsonRoute(route, GET_COMMUNITY_RES),
      );
      await page.goto(`${base}c/${COMMUNITY_SLUG}`);
      if (isMobile) {
        await expect(page.getByText(/Subscribers/).first()).toBeVisible();
      } else {
        await expect(
          page.getByText("technology@piefed.social").first(),
        ).toBeVisible();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Explore / communities listing page (/communities)
// ---------------------------------------------------------------------------

test("explore page loads communities", async ({ page }) => {
  await mockNodeinfo(page, "piefed");
  await page.route("**/api/alpha/community/list*", (route) =>
    jsonRoute(route, LIST_COMMUNITIES_RES),
  );
  await page.goto("/communities");
  const communityCard = page.getByTestId("community-card").first();
  await expect(communityCard).toBeVisible();
  await expect(communityCard).toContainText("technology@piefed.social");
});
