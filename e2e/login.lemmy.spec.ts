import { test, expect, type Page } from "@playwright/test";
import z from "zod";
import { SITE_WITH_USER } from "../test-utils/lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

const USERNAME = SITE_WITH_USER.my_user.local_user_view.person.name;
const JWT = "sdfkhsdkfjhsdfkjshdfksjdhfskjdhfskjhsfsdfsdkjfhs";

async function openAuthModal(page: Page, isMobile: boolean) {
  await page.goto("/home");
  await expect(page.getByText(USERNAME)).not.toBeVisible();

  if (isMobile) {
    await page.getByTestId("user-sidebar-trigger").click();
    await page.getByTestId("user-sidebar-login").click();
  } else {
    await page.getByTestId("user-dropdown-trigger").click();
    await expect(page.getByText("Logout")).not.toBeVisible();
    await page.getByTestId("user-dropdown-login").click();
  }
}

async function completeLogin(page: Page, isMobile: boolean) {
  const authModal = page.getByTestId("auth-modal");
  await authModal.getByPlaceholder("Username").fill("jondoe");
  await authModal.getByPlaceholder("Password").fill("password");
  await page.getByText("Sign In").click();

  await expect(page.getByText(USERNAME).first()).not.toBeAttached();
  await authModal.getByTestId("otp-input").fill("123456");
  await expect(page.getByText(USERNAME).first()).toBeAttached();

  if (isMobile) {
    await page.getByTestId("user-sidebar-trigger").click();
    await expect(
      page.getByTestId("user-sidebar-content").getByText("Logout"),
    ).toBeVisible();
  } else {
    await page.getByTestId("user-dropdown-trigger").click();
    await expect(
      page.getByTestId("user-dropdown-content").getByText("Logout"),
    ).toBeVisible();
  }
}

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/v1/instances.json", (route) =>
      jsonRoute(route, [
        {
          url: "https://lemmy.world",
          host: "lemmy.world",
          description: "A generic Lemmy server for everyone to use.",
          icon: "https://lemmy.world/pictrs/image/0fd47927-ca3a-4d2c-b2e4-a25353786671.png",
          software: "lemmy",
          registrationMode: "RequireApplication",
        },
      ]),
    );

    await mockNodeinfo(page, "lemmy");

    await page.route("**/api/**/user/login", async (route, request) => {
      const body = request.postDataJSON();
      const { totp_2fa_token } = z
        .object({ totp_2fa_token: z.string().optional() })
        .parse(body);

      if (!totp_2fa_token) {
        return jsonRoute(route, { error: "missing_totp_token" }, 400);
      }

      return jsonRoute(route, {
        jwt: JWT,
        registration_created: false,
        verify_email_sent: false,
      });
    });

    await page.route("**/api/**/site?", async (route, request) => {
      const loggedIn = request.headers()["authorization"]?.includes(JWT);
      const payload = loggedIn
        ? SITE_WITH_USER
        : { ...SITE_WITH_USER, my_user: undefined };
      return jsonRoute(route, payload);
    });
  });

  test("via instance selection", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    await openAuthModal(page, isMobile);

    const authModal = page.getByTestId("auth-modal");
    await authModal.getByTestId("auth-change-instance").click();
    await page.getByTestId("auth-filter-lemmy").click();
    await authModal.getByText("lemmy.world").click();

    await completeLogin(page, isMobile);
  });

  test("with default instance", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    await openAuthModal(page, isMobile);
    await completeLogin(page, isMobile);
  });
});
