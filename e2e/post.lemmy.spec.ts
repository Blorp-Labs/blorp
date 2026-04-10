import { test, expect, type Page } from "@playwright/test";
import {
  GET_POST_RES,
  GET_COMMENTS_RES,
  POST_LIKE_RES,
  SITE_WITH_USER,
} from "../test-utils/lemmy-api-fixtures";
import { seedAuth, jsonRoute, mockNodeinfo } from "./test-utils";
import { normalizeInstance } from "../src/normalize-instance";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

const POST_AP_ID = "https://lemmy.world/post/23863920";
const ENCODED_POST_AP_ID = encodeURIComponent(POST_AP_ID);

function postUrl(base: string) {
  return `${base}posts/${ENCODED_POST_AP_ID}`;
}

async function mockPostApis(page: Page) {
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/post*", (route) =>
    jsonRoute(route, GET_POST_RES),
  );
  await page.route("**/api/v3/comment/list*", (route) =>
    jsonRoute(route, GET_COMMENTS_RES),
  );
}

// ---------------------------------------------------------------------------
// Breadth: post page is reachable by logged-out users on every tab
// ---------------------------------------------------------------------------

for (const { name, base } of tabs) {
  test.describe(`${name}-tab post page`, () => {
    test("post and comments load", async ({ page }) => {
      await mockPostApis(page);
      await page.goto(postUrl(base));

      const postCard = page.getByTestId("post-card");
      await expect(postCard).toBeInViewport();
      await expect(postCard).toContainText(
        "What TV shows are you watching and would recommend?",
      );
      await expect(
        page
          .getByText(
            "Breaking Bad and Better Call Saul are both excellent choices.",
          )
          .first(),
      ).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// Depth: upvote triggers POST /post/like with the correct body (home tab only)
// ---------------------------------------------------------------------------

test("upvoting a post hits the vote endpoint", async ({ page }) => {
  await seedAuth(page, {
    instance: normalizeInstance("lemmy.world"),
    jwt: "test-post-jwt",
    uuid: "test-post-uuid",
  });

  await page.route("**/api/v3/site*", (route) =>
    jsonRoute(route, SITE_WITH_USER),
  );
  await mockPostApis(page);
  await page.route("**/api/v3/post/like*", (route) =>
    jsonRoute(route, POST_LIKE_RES),
  );

  await page.goto(postUrl("/home/"));

  await expect(page.getByTestId("post-card")).toBeInViewport();

  const [voteRequest] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().includes("/post/like") && req.method() === "POST",
    ),
    page.getByLabel("upvote").first().click(),
  ]);

  const body = JSON.parse(voteRequest.postData() ?? "{}");
  expect(body).toMatchObject({ post_id: 23863920, score: 1 });
});
