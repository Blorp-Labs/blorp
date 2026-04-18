import { test, expect } from "@playwright/test";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

// Arbitrary post AP ID — the redirect is purely client-side routing and
// requires no API calls, so the exact value doesn't matter.
const COMMUNITY_HANDLE = "asklemmy@lemmy.ml";
const ENCODED_POST_AP_ID = encodeURIComponent(
  "https://lemmy.world/post/23863920",
);

// ---------------------------------------------------------------------------
// Redirect: old /c/:community/posts/:post URL redirects to canonical /posts/:post
// ---------------------------------------------------------------------------

for (const { name, base } of tabs) {
  test.describe(`${name}-tab post redirect`, () => {
    test("legacy community post URL redirects to canonical URL", async ({
      page,
    }) => {
      await page.goto(
        `${base}c/${COMMUNITY_HANDLE}/posts/${ENCODED_POST_AP_ID}`,
      );
      await expect(page).toHaveURL(`${base}posts/${ENCODED_POST_AP_ID}`);
    });
  });
}
