import { test, expect, type Page } from "@playwright/test";
import { seedAuth, jsonRoute, mockNodeinfo } from "./test-utils";
import { SITE_WITH_USER } from "../test-utils/lemmy-api-fixtures";

const TEST_JWT = "test-inbox-jwt";
const TEST_UUID = "test-inbox-uuid";

// Mock all APIs the inbox fires when logged in — replies, mentions,
// reports (two endpoints), and the site refresh that checks auth validity.
async function mockInboxApis(page: Page) {
  await mockNodeinfo(page, "lemmy");
  // Site: must return my_user so useRefreshAuth doesn't log us out
  await page.route("**/api/v3/site*", (route) =>
    jsonRoute(route, SITE_WITH_USER),
  );
  await page.route("**/api/v3/user/replies*", (route) =>
    jsonRoute(route, { replies: [] }),
  );
  await page.route("**/api/v3/user/mention*", (route) =>
    jsonRoute(route, { mentions: [] }),
  );
  await page.route("**/api/v3/post/report/list*", (route) =>
    jsonRoute(route, { post_reports: [] }),
  );
  await page.route("**/api/v3/comment/report/list*", (route) =>
    jsonRoute(route, { comment_reports: [] }),
  );
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
