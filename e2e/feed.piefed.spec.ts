import { test, expect, type Page } from "@playwright/test";
import { mockNodeinfo, jsonRoute } from "./test-utils";
import {
  RESOLVE_FEED_RES,
  GET_FEED_RES,
  GET_FEED_POSTS_RES,
  FEED_OWNER_VIEW,
  GET_FEED_LIST_RES,
} from "./piefed-api-fixtures";

// The feed actor_id used in fixtures and URL construction.
const FEED_ACTOR_ID = "https://piefed.social/f/42";
const ENCODED_FEED_ACTOR_ID = encodeURIComponent(FEED_ACTOR_ID);

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

async function mockPiefedFeedApis(page: Page) {
  await mockNodeinfo(page, "piefed");
  await page.route("**/api/alpha/resolve_object*", (route) =>
    jsonRoute(route, RESOLVE_FEED_RES),
  );
  // Feed list must be matched before the single-feed route so that
  // /api/alpha/feed/list* doesn't get caught by /api/alpha/feed*.
  await page.route("**/api/alpha/feed/list*", (route) =>
    jsonRoute(route, GET_FEED_LIST_RES),
  );
  await page.route("**/api/alpha/feed*", (route) =>
    jsonRoute(route, GET_FEED_RES),
  );
  await page.route("**/api/alpha/post/list*", (route) =>
    jsonRoute(route, GET_FEED_POSTS_RES),
  );
  await page.route("**/api/alpha/user*", (route) =>
    jsonRoute(route, { person_view: FEED_OWNER_VIEW }),
  );
}

for (const { name, base } of tabs) {
  test.describe(`${name}-tab feed page`, () => {
    test("feed posts load", async ({ page }) => {
      await mockPiefedFeedApis(page);
      await page.goto(`${base}f/${ENCODED_FEED_ACTOR_ID}`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(
        "Exciting new developments in open source software",
      );
    });
  });
}
