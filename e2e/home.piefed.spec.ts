import { test, expect } from "@playwright/test";
import { mockNodeinfo } from "./test-utils";
import { GET_FEED_POSTS_RES } from "./piefed-api-fixtures";

test("home feed loads posts", async ({ page }) => {
  await mockNodeinfo(page);
  await page.route("**/api/alpha/post/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_FEED_POSTS_RES),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.goto("/home");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "Exciting new developments in open source software",
  );
});
