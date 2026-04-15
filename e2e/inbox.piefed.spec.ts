import { test, expect, type Page } from "@playwright/test";
import { seedAuth, mockNodeinfo, jsonRoute } from "./test-utils";
import { normalizeInstance } from "../src/normalize-instance";

const TEST_JWT = "test-piefed-inbox-jwt";
const TEST_UUID = "test-piefed-inbox-uuid";

async function mockInboxApis(page: Page) {
  await mockNodeinfo(page, "piefed");
  await page.route("**/api/alpha/user/replies*", (route) =>
    jsonRoute(route, { replies: [] }),
  );
  await page.route("**/api/alpha/user/mention*", (route) =>
    jsonRoute(route, { mentions: [] }),
  );
  // piefed reports are NOT_IMPLEMENTED — no report mocks needed
}

test("inbox loads when logged in", async ({ page }) => {
  await seedAuth(page, {
    instance: normalizeInstance("piefed.social"),
    jwt: TEST_JWT,
    uuid: TEST_UUID,
  });
  await mockInboxApis(page);
  await page.goto("/inbox");
  await expect(page.getByText("No notifications").first()).toBeVisible();
});
