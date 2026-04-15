import { test, expect, type Page } from "@playwright/test";
import { SITE_WITH_USER } from "../test-utils/lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

const USERNAME = SITE_WITH_USER.my_user.local_user_view.person.name;
const JWT = "signup-test-jwt";

const CAPTCHA_UUID = "test-captcha-uuid";
const CAPTCHA_IMG = "aGVsbG8=";
const CAPTCHA_WAV = "d29ybGQ=";

async function openSignupForm(page: Page, isMobile: boolean) {
  await page.goto("/home");

  if (isMobile) {
    await page.getByTestId("user-sidebar-trigger").click();
    await page.getByTestId("user-sidebar-login").click();
  } else {
    await page.getByTestId("user-dropdown-trigger").click();
    await page.getByTestId("user-dropdown-login").click();
  }

  await page.getByRole("button", { name: "Need an account?" }).click();
}

test.describe("signup", () => {
  test.beforeEach(async ({ page }) => {
    await mockNodeinfo(page, "lemmy");

    await page.route("**/api/**/user/get_captcha*", (route) =>
      jsonRoute(route, {
        ok: {
          uuid: CAPTCHA_UUID,
          png: CAPTCHA_IMG,
          wav: CAPTCHA_WAV,
        },
      }),
    );
  });

  test("submits correct payload and logs in on success", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");

    await page.route("**/api/**/site?*", async (route, request) => {
      const loggedIn = request.headers()["authorization"]?.includes(JWT);
      return jsonRoute(
        route,
        loggedIn ? SITE_WITH_USER : { ...SITE_WITH_USER, my_user: undefined },
      );
    });

    await page.route("**/api/**/user/register", (route) =>
      jsonRoute(route, {
        jwt: JWT,
        registration_created: false,
        verify_email_sent: false,
      }),
    );

    await openSignupForm(page, isMobile);

    const signupForm = page.getByTestId("signup-form");
    await signupForm.getByPlaceholder("Email").fill("newuser@example.com");
    await signupForm.getByPlaceholder("Username").fill("newuser");
    await signupForm.getByPlaceholder("Enter password").fill("hunter2");
    await signupForm.getByPlaceholder("Confirm password").fill("hunter2");
    await signupForm.getByPlaceholder("Captcha answer").fill("correct-answer");
    await signupForm.getByPlaceholder("Application answer").fill("test answer");

    const registerRequest = page.waitForRequest("**/api/**/user/register");
    await signupForm.getByRole("button", { name: "Sign up" }).click();
    const req = await registerRequest;

    expect(req.postDataJSON()).toMatchObject({
      username: "newuser",
      password: "hunter2",
      password_verify: "hunter2",
      email: "newuser@example.com",
      captcha_uuid: CAPTCHA_UUID,
      captcha_answer: "correct-answer",
      answer: "test answer",
    });

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
  });

  test("shows closed registration banner", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");

    await page.route("**/api/**/site?*", (route) =>
      jsonRoute(route, {
        ...SITE_WITH_USER,
        my_user: undefined,
        site_view: {
          ...SITE_WITH_USER.site_view,
          local_site: {
            ...SITE_WITH_USER.site_view.local_site,
            registration_mode: "Closed",
          },
        },
      }),
    );

    await openSignupForm(page, isMobile);

    await expect(
      page.getByText("This instance is not currently accepting registrations"),
    ).toBeVisible();
  });

  test("shows application question when registration requires application", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const applicationQuestion =
      "Why do you want to join? Please describe yourself.";

    await page.route("**/api/**/site?*", (route) =>
      jsonRoute(route, {
        ...SITE_WITH_USER,
        my_user: undefined,
        site_view: {
          ...SITE_WITH_USER.site_view,
          local_site: {
            ...SITE_WITH_USER.site_view.local_site,
            registration_mode: "RequireApplication",
            application_question: applicationQuestion,
          },
        },
      }),
    );

    await openSignupForm(page, isMobile);

    await expect(
      page.getByText(
        "To join this server, you need to fill out the application below",
      ),
    ).toBeVisible();
    await expect(page.getByText(applicationQuestion)).toBeVisible();
  });
});
