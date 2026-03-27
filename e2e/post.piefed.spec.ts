import { test, expect, type Page } from "@playwright/test";
import {
  GET_POST_RES,
  GET_POST_REPLIES_RES,
  POST_LIKE_RES,
  RESOLVE_POST_RES,
} from "./piefed-api-fixtures";
import { seedAuth, mockNodeinfo, jsonRoute } from "./test-utils";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

const COMMUNITY_SLUG = "technology@piefed.social";
const POST_AP_ID = "https://piefed.social/post/99001";
const ENCODED_POST_AP_ID = encodeURIComponent(POST_AP_ID);

function postUrl(base: string) {
  return `${base}c/${COMMUNITY_SLUG}/posts/${ENCODED_POST_AP_ID}`;
}

async function mockPostApis(page: Page) {
  // resolve_object needed when the post AP ID is on a different instance than
  // the selected account (e.g. logged-out breadth tests using the default
  // lemmy.zip instance to view a piefed.social post).
  await page.route("**/api/alpha/resolve_object*", (route) =>
    jsonRoute(route, RESOLVE_POST_RES),
  );
  // post/like must be registered before the broader /post* pattern
  await page.route("**/api/alpha/post/like*", (route) =>
    jsonRoute(route, POST_LIKE_RES),
  );
  await page.route("**/api/alpha/post*", (route) =>
    jsonRoute(route, GET_POST_RES),
  );
  await page.route("**/api/alpha/post/replies*", (route) =>
    jsonRoute(route, GET_POST_REPLIES_RES),
  );
}

// ---------------------------------------------------------------------------
// Breadth: post page is reachable by logged-out users on every tab
// ---------------------------------------------------------------------------

for (const { name, base } of tabs) {
  test.describe(`${name}-tab post page`, () => {
    test("post and comments load", async ({ page }) => {
      await mockNodeinfo(page);
      await mockPostApis(page);
      await page.goto(postUrl(base));

      const postCard = page.getByTestId("post-card");
      await expect(postCard).toBeInViewport();
      await expect(postCard).toContainText(
        "Exciting new developments in open source software",
      );
      await expect(
        page
          .getByText(
            "I've been really enjoying the new Linux kernel updates lately.",
          )
          .first(),
      ).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// Depth: upvote triggers POST /api/alpha/post/like with the correct body
//        (home tab only)
// ---------------------------------------------------------------------------

test("upvoting a post hits the vote endpoint", async ({ page }) => {
  await seedAuth(page, {
    instance: "piefed.social",
    jwt: "test-piefed-post-jwt",
    uuid: "test-piefed-post-uuid",
  });
  await mockNodeinfo(page);
  await mockPostApis(page);

  await page.goto(postUrl("/home/"));

  await expect(page.getByTestId("post-card")).toBeInViewport();

  const [voteRequest] = await Promise.all([
    page.waitForRequest(
      (req) =>
        req.url().includes("/api/alpha/post/like") && req.method() === "POST",
    ),
    page.getByLabel("upvote").first().click(),
  ]);

  const body = JSON.parse(voteRequest.postData() ?? "{}");
  expect(body).toMatchObject({ post_id: 99001, score: 1 });
});
