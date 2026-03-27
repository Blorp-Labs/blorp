import { test, expect } from "@playwright/test";
import { GET_POSTS_RES } from "./lemmy-api-fixtures";

test("home feed loads posts", async ({ page }) => {
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
  await page.goto("/home");
  const postCard = page.getByTestId("post-card").first();
  await expect(postCard).toBeVisible();
  await expect(postCard).toContainText(
    "What TV shows are you watching and would recommend?",
  );
});
