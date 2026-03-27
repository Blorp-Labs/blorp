import { test, expect } from "@playwright/test";
import { mockNodeinfo } from "./test-utils";
import { GET_FEED_POSTS_RES } from "./piefed-api-fixtures";

// SavedContent is only rendered at /home/saved — the communities and inbox
// tabs define the route for link generation but don't render SavedContent.
test("saved posts load", async ({ page }) => {
  await mockNodeinfo(page);
  await page.route("**/api/alpha/post/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_FEED_POSTS_RES),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/alpha/comment/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ comments: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.goto("/home/saved");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "Exciting new developments in open source software",
  );
});
