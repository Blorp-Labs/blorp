import { test, expect, type Page } from "@playwright/test";
import {
  RESOLVE_PERSON_RES,
  GET_PERSON_DETAILS_RES,
} from "../test-utils/lemmy-api-fixtures";
import { jsonRoute, mockNodeinfo } from "./test-utils";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

async function mockUserApis(page: Page) {
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/resolve_object*", (route) =>
    jsonRoute(route, RESOLVE_PERSON_RES),
  );
  await page.route("**/api/v3/user*", (route) =>
    jsonRoute(route, GET_PERSON_DETAILS_RES),
  );
}

for (const { name, base } of tabs) {
  test.describe(`${name}-tab user page`, () => {
    test("user info renders", async ({ page }) => {
      await mockUserApis(page);
      await page.goto(
        `${base}u/https%3A%2F%2Flemmy.world%2Fu%2FThe_Picard_Maneuver`,
      );
      // Handle only renders if person data was correctly written to and read
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
