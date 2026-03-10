import { test, expect, Page } from "@playwright/test";

/** Click an Ionic tab button by tab id (works on all viewports) */
async function clickTab(page: Page, tabId: string) {
  await page.evaluate((id) => {
    const tab = document.querySelector(`ion-tab-button[tab="${id}"]`);
    if (tab instanceof HTMLElement) tab.click();
  }, tabId);
}

/** Focus a cmdk input by test id, type text, then optionally submit.
 *  cmdk inputs don't work with Playwright's fill(), so we use keyboard.type()
 *  which sends real key events that cmdk processes correctly.
 *  We filter by :visible to avoid strict-mode violations when Ionic keeps
 *  multiple pages mounted simultaneously. */
async function typeInSearchBar(
  page: Page,
  testId: string,
  text: string,
  submit = false,
) {
  const input = page
    .locator(`[data-testid="${testId}"]`)
    .and(page.locator(":visible"));
  await input.click();
  await page.keyboard.type(text, { delay: 50 });
  if (submit) {
    await page.keyboard.press("Enter");
  }
}

test("editing search on one tab does not affect another tab's search", async ({
  page,
}, testInfo) => {
  const isMobile = testInfo.project.name.includes("Mobile");

  // 1. Load home feed, navigate to home search with "cats"
  await page.goto("/home");
  await page.waitForLoadState("networkidle");

  if (isMobile) {
    await page.getByTestId("home-search-link").click();
    await typeInSearchBar(page, "search-page-input", "cats");
  } else {
    await typeInSearchBar(page, "home-search-bar", "cats", true);
  }

  await expect(page).toHaveURL(/\/home\/s/);
  await expect(page).toHaveURL(/q=cats/);

  // 2. Switch to communities tab, navigate to communities search with "dogs"
  await clickTab(page, "explore");
  await expect(page).toHaveURL(/\/communities/);

  if (isMobile) {
    await page
      .locator('[data-testid="explore-search-link"]')
      .and(page.locator(":visible"))
      .click();
    await typeInSearchBar(page, "search-page-input", "dogs");
  } else {
    await typeInSearchBar(page, "explore-search-bar", "dogs", true);
  }

  await expect(page).toHaveURL(/\/communities\/s/);
  await expect(page).toHaveURL(/q=dogs/);

  // 3. Switch back to home tab — input should still show "cats"
  await clickTab(page, "home");
  if (isMobile) {
    const homeInput = page
      .locator('[data-testid="search-page-input"]')
      .and(page.locator(":visible"));
    await expect(homeInput).toHaveValue("cats");
  } else {
    await expect(page.getByTestId("home-search-bar")).toHaveValue("cats");
  }

  // 4. Switch to communities tab — input should still show "dogs"
  await clickTab(page, "explore");
  if (isMobile) {
    const exploreInput = page
      .locator('[data-testid="search-page-input"]')
      .and(page.locator(":visible"));
    await expect(exploreInput).toHaveValue("dogs");
  } else {
    await expect(page.getByTestId("explore-search-bar")).toHaveValue("dogs");
  }
});
