import { test, expect } from "@playwright/test";
import { GET_POSTS_RES, GET_COMMENTS_RES } from "./lemmy-api-fixtures";

// SavedContent is only rendered at /home/saved — the communities and inbox
// tabs define the route for link generation but don't render SavedContent.
test("saved posts load", async ({ page }) => {
  await page.route("**/api/v3/post/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_POSTS_RES),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });
  await page.route("**/api/v3/comment/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_COMMENTS_RES),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });
  await page.goto("/home/saved");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "What TV shows are you watching and would recommend?",
  );
});
