import { test, expect } from "@playwright/test";
import { mockNodeinfo, jsonRoute } from "./test-utils";
import { GET_FEED_POSTS_RES } from "./piefed-api-fixtures";

// SavedContent is only rendered at /home/saved — the communities and inbox
// tabs define the route for link generation but don't render SavedContent.
test("saved posts load", async ({ page }) => {
  await mockNodeinfo(page);
  await page.route("**/api/alpha/post/list*", (route) =>
    jsonRoute(route, GET_FEED_POSTS_RES),
  );
  await page.route("**/api/alpha/comment/list*", (route) =>
    jsonRoute(route, { comments: [] }),
  );
  await page.goto("/home/saved");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "Exciting new developments in open source software",
  );
});
