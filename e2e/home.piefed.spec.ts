import { test, expect } from "@playwright/test";
import { mockNodeinfo, jsonRoute } from "./test-utils";
import { GET_FEED_POSTS_RES } from "./piefed-api-fixtures";

test("home feed loads posts", async ({ page }) => {
  await mockNodeinfo(page, "piefed");
  await page.route("**/api/alpha/post/list*", (route) =>
    jsonRoute(route, GET_FEED_POSTS_RES),
  );
  await page.goto("/home");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "Exciting new developments in open source software",
  );
});
