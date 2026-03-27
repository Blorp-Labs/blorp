import { test, expect, type Page } from "@playwright/test";
import { mockNodeinfo } from "./test-utils";
import {
  RESOLVE_PERSON_RES,
  GET_USER_RES,
  GET_FEED_POSTS_RES,
} from "./piefed-api-fixtures";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

const USER_ACTOR_ID = "https://piefed.social/u/feed_owner";
const ENCODED_USER_ACTOR_ID = encodeURIComponent(USER_ACTOR_ID);

async function mockUserApis(page: Page) {
  await mockNodeinfo(page);
  // resolve_object is needed when the logged-out default instance differs
  // from piefed.social — piefed's resolveObjectId calls it for remote actors.
  await page.route("**/api/alpha/resolve_object*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(RESOLVE_PERSON_RES),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/alpha/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_USER_RES),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  // The posts tab fetches user posts via post/list (not from the user response)
  await page.route("**/api/alpha/post/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_FEED_POSTS_RES),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
}

for (const { name, base } of tabs) {
  test.describe(`${name}-tab user page`, () => {
    test("user info renders", async ({ page }) => {
      await mockUserApis(page);
      await page.goto(`${base}u/${ENCODED_USER_ACTOR_ID}`);
      await expect(
        page.getByText("feed_owner@piefed.social").first(),
      ).toBeVisible();
    });

    test("posts load", async ({ page }) => {
      await mockUserApis(page);
      await page.goto(`${base}u/${ENCODED_USER_ACTOR_ID}?type=posts`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(
        "Exciting new developments in open source software",
      );
    });
  });
}
