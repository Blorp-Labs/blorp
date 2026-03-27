import { test, expect } from "@playwright/test";
import z from "zod";
import { SITE_WITH_USER } from "./lemmy-api-fixtures";

const USERNAME = SITE_WITH_USER.my_user.local_user_view.person.name;
const JWT = "sdfkhsdkfjhsdfkjshdfksjdhfskjdhfskjhsfsdfsdkjfhs";

test("login", async ({ page }, testInfo) => {
  await page.route("**/v1/instances.json", async (route) => {
    const mockPayload = [
      {
        url: "https://lemmy.world",
        host: "lemmy.world",
        description: "A generic Lemmy server for everyone to use.",
        icon: "https://lemmy.world/pictrs/image/0fd47927-ca3a-4d2c-b2e4-a25353786671.png",
        software: "lemmy",
        registrationMode: "RequireApplication",
      },
    ];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPayload),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });

  await page.route("**/nodeinfo/2.1", async (route) => {
    const mockPayload = {
      version: "2.1",
      software: {
        name: "lemmy",
        version: "0.19.12-4-gd8445881a",
        repository: "https://github.com/LemmyNet/lemmy",
        homepage: "https://join-lemmy.org/",
      },
      protocols: ["activitypub"],
      usage: {
        users: {
          total: 177887,
          activeHalfyear: 29711,
          activeMonth: 15751,
        },
        localPosts: 538889,
        localComments: 5102780,
      },
      openRegistrations: true,
      services: {
        inbound: [],
        outbound: [],
      },
      metadata: {},
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPayload),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });

  await page.route("**/api/**/user/login", async (route, request) => {
    const body = request.postDataJSON();
    const { totp_2fa_token } = z
      .object({
        totp_2fa_token: z.string().optional(),
      })
      .parse(body);

    if (!totp_2fa_token) {
      return await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "missing_totp_token" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const mockPayload = {
      jwt: JWT,
      registration_created: false,
      verify_email_sent: false,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPayload),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });

  await page.route("**/api/**/site?", async (route, request) => {
    const loggedIn = request.headers()["authorization"]?.includes(JWT);
    const payload = loggedIn
      ? SITE_WITH_USER
      : { ...SITE_WITH_USER, my_user: undefined };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
      headers: {
        "Access-Control-Allow-Origin": "*",
        contentType: "application/json",
      },
    });
  });

  const isMobile = testInfo.project.name.includes("Mobile");

  await page.goto("/home");

  await expect(page.getByText(USERNAME)).not.toBeVisible();

  if (isMobile) {
    await expect(page.getByTestId("user-sidebar-trigger")).toBeVisible();
    await page.getByTestId("user-sidebar-trigger").click();
  } else {
    await expect(page.getByTestId("user-dropdown-trigger")).toBeVisible();
    await page.getByTestId("user-dropdown-trigger").click();
  }

  await expect(page.getByText("Logout")).not.toBeVisible();

  if (isMobile) {
    await page.getByTestId("user-sidebar-login").click();
  } else {
    await page.getByTestId("user-dropdown-login").click();
  }

  const authModal = page.getByTestId("auth-modal");
  await page.getByTestId("auth-filter-lemmy").click();
  await authModal.getByText("lemmy.world").click();
  await authModal.getByPlaceholder("Username").fill("jondoe");
  await authModal.getByPlaceholder("Password").fill("password");

  await page.getByText("Sign In").click();

  await expect(page.getByText(USERNAME).first()).not.toBeAttached();

  await authModal.getByTestId("otp-input").fill("123456");

  await expect(page.getByText(USERNAME).first()).toBeAttached();

  if (isMobile) {
    await page.getByTestId("user-sidebar-trigger").click();
    const dropdown = page.getByTestId("user-sidebar-content");
    await expect(dropdown.getByText("Logout")).toBeVisible();
  } else {
    await page.getByTestId("user-dropdown-trigger").click();
    const dropdown = page.getByTestId("user-dropdown-content");
    await expect(dropdown.getByText("Logout")).toBeVisible();
  }
});
