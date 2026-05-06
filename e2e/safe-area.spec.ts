import { test, expect } from "@playwright/test";

test("web safe-area pipeline writes --ion-safe-area-* on documentElement", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // applyCapacitorFixes -> registerSafeArea -> createWebEnvSource reads env()
  // and writes --ion-safe-area-* on documentElement. Desktop Chrome resolves
  // env(safe-area-inset-*) to 0px, so we expect a finite "Npx" value on each
  // side (proves the env() -> getComputedStyle -> setProperty path executes).
  const insets = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      top: cs.getPropertyValue("--ion-safe-area-top").trim(),
      right: cs.getPropertyValue("--ion-safe-area-right").trim(),
      bottom: cs.getPropertyValue("--ion-safe-area-bottom").trim(),
      left: cs.getPropertyValue("--ion-safe-area-left").trim(),
    };
  });

  expect(insets.top).toMatch(/^\d+px$/);
  expect(insets.right).toMatch(/^\d+px$/);
  expect(insets.bottom).toMatch(/^\d+px$/);
  expect(insets.left).toMatch(/^\d+px$/);
});

test("env() probe element is mounted and hidden", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const result = await page.evaluate(() => {
    const probes = Array.from(
      document.body.querySelectorAll('div[aria-hidden="true"]'),
    );
    for (const el of probes) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" && cs.visibility === "hidden") {
        return {
          paddingTop: cs.paddingTop,
          paddingRight: cs.paddingRight,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
        };
      }
    }
    return null;
  });
  expect(result).not.toBeNull();
  // Each padding side resolves env() to a px value (0px on Desktop Chrome).
  expect(result!.paddingTop).toMatch(/px$/);
  expect(result!.paddingBottom).toMatch(/px$/);
});
