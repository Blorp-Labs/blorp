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

function lightboxUrl(postView: { post: { ap_id: string } }) {
  return `/home/lightbox?apId=${encodedApId(postView)}`;
}

async function mockLightboxApis(page: Page) {
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/post/list*", (route) =>
    jsonRoute(route, GET_IMAGE_POSTS_RES),
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
    await expect(page).toHaveURL(new RegExp(encodedApId(IMAGE_POST_VIEW_2)));
  });

  test("direct URL — fetches and prepends post not in feed", async ({
    page,
  }) => {
    await mockNodeinfo(page, "lemmy");

    // Register single-post routes before post/list (Playwright matches LIFO)
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
    await expect(page).toHaveURL(
      new RegExp(encodedApId(MISSING_IMAGE_POST_VIEW)),
    );
  });

  test("arrow key navigation cycles through image posts in order", async ({
    page,
  }) => {
    await mockLightboxApis(page);
    await page.goto(lightboxUrl(IMAGE_POST_VIEW_1));

    const title = page.getByTestId("lightbox-toolbar-title");

    // Starts on first image post
    await expect(title).toContainText(IMAGE_POST_VIEW_1.post.name);
    await expect(page).toHaveURL(new RegExp(encodedApId(IMAGE_POST_VIEW_1)));

    // ArrowRight → second image post (text post filtered out)
    await page.keyboard.press("ArrowRight");
    await expect(title).toContainText(IMAGE_POST_VIEW_2.post.name);
    await expect(page).toHaveURL(new RegExp(encodedApId(IMAGE_POST_VIEW_2)));

    // ArrowRight → third image post
    await page.keyboard.press("ArrowRight");
    await expect(title).toContainText(IMAGE_POST_VIEW_3.post.name);
    await expect(page).toHaveURL(new RegExp(encodedApId(IMAGE_POST_VIEW_3)));
  });

  test("clicking image in home feed opens lightbox at that post", async ({
    page,
  }) => {
    await mockLightboxApis(page);
    await page.goto("/home");

    // Wait for feed to load
    const postCards = page.getByTestId("post-card");
    await expect(postCards.first()).toBeVisible();

    // Click the image link (cursor-zoom-in) on the second image post.
    // IMAGE_POST_VIEW_2 is the 3rd post in GET_IMAGE_POSTS_RES
    // (after IMAGE_POST_VIEW_1 and TEXT_POST_VIEW), but TEXT_POST_VIEW
    // has no image so only image posts render clickable image links.
    // The second cursor-zoom-in link corresponds to IMAGE_POST_VIEW_2.
    await page.locator(".cursor-zoom-in").nth(1).click();

    const title = page.getByTestId("lightbox-toolbar-title");
    await expect(title).toContainText(IMAGE_POST_VIEW_2.post.name);
    await expect(page).toHaveURL(new RegExp(encodedApId(IMAGE_POST_VIEW_2)));
  });
});
