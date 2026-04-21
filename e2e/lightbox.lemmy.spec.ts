import { test, expect, type Page } from "@playwright/test";
import {
  GET_IMAGE_POSTS_RES,
  GET_MISSING_IMAGE_POST_RES,
  RESOLVE_MISSING_IMAGE_POST_RES,
  IMAGE_POST_VIEW_1,
  IMAGE_POST_VIEW_2,
  IMAGE_POST_VIEW_3,
  MISSING_IMAGE_POST_VIEW,
} from "../test-utils/lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodedApId(postView: { post: { ap_id: string } }) {
  return encodeURIComponent(postView.post.ap_id);
}

/** Regex matching the single-encoded ap_id in the browser URL */
function apIdUrlPattern(postView: { post: { ap_id: string } }) {
  return new RegExp(encodedApId(postView));
}

function lightboxUrl(postView: { post: { ap_id: string } }) {
  return `/home/lightbox?apId=${encodedApId(postView)}`;
}

async function mockLightboxApis(page: Page) {
  await mockNodeinfo(page, "lemmy");

  // Safety net: on first render posts=[] so useLightboxPostsData thinks the
  // target post is "missing" and fires usePostQuery (resolve_object then post).
  // Without these mocks that query fails and clears the apId from the URL.
  // Once the post/list response arrives the missingPost flag flips to false and
  // the resolve result is discarded, so the exact payload doesn't matter much.
  await page.route("**/api/v3/resolve_object*", (route) =>
    jsonRoute(route, { post: IMAGE_POST_VIEW_1 }),
  );
  await page.route("**/api/v3/post?*", (route) =>
    jsonRoute(route, {
      post_view: IMAGE_POST_VIEW_1,
      community_view: {
        community: IMAGE_POST_VIEW_1.community,
        subscribed: "NotSubscribed" as const,
        blocked: false,
        banned_from_community: false,
        counts: {
          community_id: 1,
          subscribers: 10000,
          posts: 1000,
          comments: 50000,
          published: "2019-06-01T15:07:36.179766Z",
          users_active_day: 100,
          users_active_week: 500,
          users_active_month: 2000,
          users_active_half_year: 5000,
          subscribers_local: 5000,
        },
      },
      moderators: [],
      cross_posts: [],
    }),
  );

  // Small delay lets Ionic finish its route transition so that
  // useIsActiveRoute() returns true before data populates.
  await page.route("**/api/v3/post/list*", async (route) => {
    await new Promise((r) => setTimeout(r, 100));
    await jsonRoute(route, GET_IMAGE_POSTS_RES);
  });
}

/** Dispatch a keydown event directly on `document` where the handler listens. */
async function pressKey(page: Page, key: string) {
  await page.evaluate(
    (k) =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: k, bubbles: true }),
      ),
    key,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("lightbox feed", () => {
  test("direct URL — shows correct post when apId exists in feed", async ({
    page,
  }) => {
    await mockLightboxApis(page);
    await page.goto(lightboxUrl(IMAGE_POST_VIEW_2));

    const title = page.getByTestId("lightbox-toolbar-title");
    await expect(title).toContainText(IMAGE_POST_VIEW_2.post.name);
    await expect(page).toHaveURL(apIdUrlPattern(IMAGE_POST_VIEW_2));
  });

  test("direct URL — fetches and prepends post not in feed", async ({
    page,
  }) => {
    await mockNodeinfo(page, "lemmy");

    await page.route("**/api/v3/resolve_object*", (route) =>
      jsonRoute(route, RESOLVE_MISSING_IMAGE_POST_RES),
    );
    await page.route("**/api/v3/post?*", (route) =>
      jsonRoute(route, GET_MISSING_IMAGE_POST_RES),
    );
    await page.route("**/api/v3/post/list*", (route) =>
      jsonRoute(route, GET_IMAGE_POSTS_RES),
    );

    await page.goto(lightboxUrl(MISSING_IMAGE_POST_VIEW));

    const title = page.getByTestId("lightbox-toolbar-title");
    await expect(title).toContainText(MISSING_IMAGE_POST_VIEW.post.name);
    await expect(page).toHaveURL(apIdUrlPattern(MISSING_IMAGE_POST_VIEW));
  });

  test("arrow key navigation cycles through image posts in order", async ({
    page,
  }, testInfo) => {
    // Keyboard shortcuts only work on desktop (useKeyboardShortcut checks media.md)
    test.skip(testInfo.project.name === "Mobile Chrome");

    await mockLightboxApis(page);
    await page.goto(lightboxUrl(IMAGE_POST_VIEW_1));

    const title = page.getByTestId("lightbox-toolbar-title");

    // Starts on first image post
    await expect(title).toContainText(IMAGE_POST_VIEW_1.post.name);
    await expect(page).toHaveURL(apIdUrlPattern(IMAGE_POST_VIEW_1));

    // Small delay lets swiper finish mounting before key input
    await page.waitForTimeout(200);

    // ArrowRight → second image post (text post filtered out)
    await pressKey(page, "ArrowRight");
    await expect(title).toContainText(IMAGE_POST_VIEW_2.post.name);
    await expect(page).toHaveURL(apIdUrlPattern(IMAGE_POST_VIEW_2));

    // ArrowRight → third image post
    await page.waitForTimeout(100);
    await pressKey(page, "ArrowRight");
    await expect(title).toContainText(IMAGE_POST_VIEW_3.post.name);
    await expect(page).toHaveURL(apIdUrlPattern(IMAGE_POST_VIEW_3));
  });

  test("clicking image in home feed opens lightbox at that post", async ({
    page,
  }) => {
    await mockLightboxApis(page);

    // Mock image requests so thumbnails render with dimensions
    const PIXEL =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    await page.route("https://picsum.photos/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(PIXEL, "base64"),
      }),
    );

    await page.goto("/home");

    // Wait for feed to load
    const postCards = page.getByTestId("post-card");
    await expect(postCards.first()).toBeVisible();

    // VirtualList only renders posts visible in the viewport, so on a 1280x720
    // desktop screen only the first image post's lightbox link is guaranteed to
    // exist in the DOM.
    const lightboxLinks = page.locator('a[href*="lightbox"]');
    await expect(lightboxLinks.first()).toBeVisible();
    await lightboxLinks.first().click({ force: true });

    const title = page.getByTestId("lightbox-toolbar-title");
    await expect(title).toContainText(IMAGE_POST_VIEW_1.post.name);
    await expect(page).toHaveURL(/lightbox/);
  });
});
