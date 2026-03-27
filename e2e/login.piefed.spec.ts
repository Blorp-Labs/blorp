import { test, expect } from "@playwright/test";
import { PIEFED_SITE_WITH_USER } from "./piefed-api-fixtures";

const USERNAME = "feed_owner";
const JWT = "test-piefed-login-jwt";

test("login", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name.includes("Mobile");

  await page.route("**/v1/instances.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          url: "https://piefed.social",
          host: "piefed.social",
          description: "A general-purpose PieFed server.",
          software: "piefed",
          registrationMode: "Open",
        },
      ]),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });

  await page.route("**/nodeinfo/2.1*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        software: { name: "piefed", version: "1.6.0" },
      }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });

  await page.route("**/api/alpha/user/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jwt: JWT }),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });

  await page.route("**/api/alpha/site*", async (route, request) => {
    const loggedIn = request.headers()["authorization"]?.includes(JWT);
    const payload = loggedIn
      ? PIEFED_SITE_WITH_USER
      : { ...PIEFED_SITE_WITH_USER, my_user: undefined };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });

  await page.goto("/home");

  await expect(page.getByText(USERNAME)).not.toBeVisible();

  if (isMobile) {
    await page.getByTestId("user-sidebar-trigger").click();
    await page.getByTestId("user-sidebar-login").click();
  } else {
    await page.getByTestId("user-dropdown-trigger").click();
    await page.getByTestId("user-dropdown-login").click();
  }

  const authModal = page.getByTestId("auth-modal");
  await page.getByTestId("auth-filter-piefed").click();
  await authModal.getByText("piefed.social").click();
  await authModal.getByPlaceholder("Username").fill("feed_owner");
  await authModal.getByPlaceholder("Password").fill("password");

  await page.getByText("Sign In").click();

  // piefed login has no TOTP step — one click and we're in
  await expect(page.getByText(USERNAME).first()).toBeAttached();

  if (isMobile) {
    await page.getByTestId("user-sidebar-trigger").click();
    const sidebar = page.getByTestId("user-sidebar-content");
    await expect(sidebar.getByText("Logout")).toBeVisible();
  } else {
    await page.getByTestId("user-dropdown-trigger").click();
    const dropdown = page.getByTestId("user-dropdown-content");
    await expect(dropdown.getByText("Logout")).toBeVisible();
  }
});
