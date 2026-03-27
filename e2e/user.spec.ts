import { test, expect, type Page } from "@playwright/test";
import {
  RESOLVE_PERSON_RES,
  GET_PERSON_DETAILS_RES,
} from "./lemmy-api-fixtures";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

async function mockUserApis(page: Page) {
  await page.route("**/api/v3/resolve_object*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(RESOLVE_PERSON_RES),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });
  await page.route("**/api/v3/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GET_PERSON_DETAILS_RES),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  });
}

for (const { name, base } of tabs) {
  test.describe(`${name}-tab user page`, () => {
    test("user info renders", async ({ page }) => {
      await mockUserApis(page);
      await page.goto(
        `${base}u/https%3A%2F%2Flemmy.world%2Fu%2FThe_Picard_Maneuver`,
      );
      // Slug only renders if person data was correctly written to and read
      // from the cache — the fallback is "Person" if the data is missing
      await expect(
        page.getByText("The_Picard_Maneuver@lemmy.world").first(),
      ).toBeVisible();
    });

    test("posts load", async ({ page }) => {
      await mockUserApis(page);
      await page.goto(
        `${base}u/https%3A%2F%2Flemmy.world%2Fu%2FThe_Picard_Maneuver?type=posts`,
      );
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(
        "What TV shows are you watching and would recommend?",
      );
    });
  });
}
