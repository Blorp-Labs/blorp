import { test, expect } from "@playwright/test";
import {
  GET_POSTS_RES,
  GET_COMMENTS_RES,
} from "../test-utils/lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

// SavedContent is only rendered at /home/saved — the communities and inbox
// tabs define the route for link generation but don't render SavedContent.
test("saved posts load", async ({ page }) => {
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/post/list*", (route) =>
    jsonRoute(route, GET_POSTS_RES),
  );
  await page.route("**/api/v3/comment/list*", (route) =>
    jsonRoute(route, GET_COMMENTS_RES),
  );
  await page.goto("/home/saved");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "What TV shows are you watching and would recommend?",
  );
});
