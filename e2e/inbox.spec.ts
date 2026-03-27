import { test, expect, type Page } from "@playwright/test";
import { seedAuth } from "./test-utils";
import { SITE_WITH_USER } from "./lemmy-api-fixtures";

const TEST_JWT = "test-inbox-jwt";
const TEST_UUID = "test-inbox-uuid";

// Mock all APIs the inbox fires when logged in — replies, mentions,
// reports (two endpoints), and the site refresh that checks auth validity.
async function mockInboxApis(page: Page) {
  // Site: must return my_user so useRefreshAuth doesn't log us out
  await page.route("**/api/v3/site*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SITE_WITH_USER),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });
  await page.route("**/api/v3/user/replies*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ replies: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/v3/user/mention*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mentions: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/v3/post/report/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ post_reports: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/v3/comment/report/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ comment_reports: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
}

test("inbox loads when logged in", async ({ page }) => {
  await seedAuth(page, {
    instance: "lemmy.world",
    jwt: TEST_JWT,
    uuid: TEST_UUID,
  });
  await mockInboxApis(page);
  await page.goto("/inbox");
  // Empty inbox shows "No notifications" — verifies the page renders
  // correctly and the auth-gated queries fired without errors
  await expect(page.getByText("No notifications").first()).toBeVisible();
});
