import { test, expect, type Page } from "@playwright/test";
import { seedAuth, mockNodeinfo } from "./test-utils";

const TEST_JWT = "test-piefed-inbox-jwt";
const TEST_UUID = "test-piefed-inbox-uuid";

async function mockInboxApis(page: Page) {
  await mockNodeinfo(page);
  await page.route("**/api/alpha/user/replies*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ replies: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/alpha/user/mention*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mentions: [] }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  // piefed reports are NOT_IMPLEMENTED — no report mocks needed
}

test("inbox loads when logged in", async ({ page }) => {
  await seedAuth(page, {
    instance: "piefed.social",
    jwt: TEST_JWT,
    uuid: TEST_UUID,
  });
  await mockInboxApis(page);
  await page.goto("/inbox");
  await expect(page.getByText("No notifications").first()).toBeVisible();
});
