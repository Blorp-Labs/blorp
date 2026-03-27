import { test, expect } from "@playwright/test";
import { GET_POSTS_RES } from "./lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

test("home feed loads posts", async ({ page }) => {
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/post/list*", (route) =>
    jsonRoute(route, GET_POSTS_RES),
  );
  await page.goto("/home");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "What TV shows are you watching and would recommend?",
  );
});
