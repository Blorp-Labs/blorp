import { test, expect, type Page } from "@playwright/test";
import { jsonRoute, mockNodeinfo } from "./test-utils";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

/** Click an Ionic tab button by tab id (works on all viewports) */
async function clickTab(page: Page, tabId: string) {
  await page.evaluate((id) => {
    const tab = document.querySelector(`ion-tab-button[tab="${id}"]`);
    if (tab instanceof HTMLElement) {
      tab.click();
    }
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

for (const { name, base } of tabs) {
  test.describe(`${name}-tab search`, () => {
    test("loads search results", async ({ page }) => {
      await mockNodeinfo(page, "lemmy");
      await page.route("**/api/v3/search*", (route) =>
        jsonRoute(route, SEARCH_RES),
      );
      await page.goto(`${base}s?q=linux+phone`);
      const postCard = page
        .getByTestId(base === "/communities/" ? "community-card" : "post-card")
        .first();
      await expect(postCard).toContainText("linux", {
        ignoreCase: true,
      });
    });

    test("loads community search results", async ({ page }) => {
      await mockNodeinfo(page, "lemmy");
      await page.route("**/api/v3/search*", (route) =>
        jsonRoute(route, SEARCH_RES),
      );
      await page.goto(`${base}c/programmer_humor@programming.dev/s?q=linux`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toContainText("programmer_humor@programming.dev");
    });
  });
}

// No API mocks needed — this test only checks that the search input values are
// independent across tabs. It doesn't assert on any loaded results.
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

const SEARCH_RES = {
  type_: "Posts",
  comments: [],
  posts: [
    {
      post: {
        id: 37027413,
        name: "Every goto in the Linux kernel / Just another day on the linux-kernel mailing list",
        url: "https://youtube.com/watch?v=v1Mfirg2-Z8",
        creator_id: 56690,
        community_id: 5825,
        removed: false,
        locked: false,
        published: "2025-10-07T18:05:17.516473Z",
        updated: "2025-10-07T18:06:12.369047Z",
        deleted: false,
        nsfw: false,
        embed_title: "- YouTube",
        embed_description:
          "Auf YouTube findest du die angesagtesten Videos und Tracks. Außerdem kannst du eigene Inhalte hochladen und mit Freunden oder gleich der ganzen Welt teilen.",
        ap_id: "https://programming.dev/post/38695969",
        local: false,
        language_id: 37,
        featured_community: false,
        featured_local: false,
        url_content_type: "text/html; charset=utf-8",
      },
      creator: {
        id: 56690,
        name: "ruffsl",
        display_name: "ruffsl",
        avatar:
          "https://programming.dev/pictrs/image/104fdd2c-9db4-4643-bf4c-4b2c28750dc3.png",
        banned: false,
        published: "2023-06-09T13:05:22.459045Z",
        actor_id: "https://programming.dev/u/ruffsl",
        bio: "I'm a robotics researcher. My interests include cybersecurity, repeatable & reproducible research, as well as open source robotics and rust programing.",
        local: false,
        deleted: false,
        bot_account: false,
        instance_id: 516,
      },
      community: {
        id: 5825,
        name: "programmer_humor",
        title: "Programmer Humor",
        description:
          "Welcome to Programmer Humor!\n\nThis is a place where you can post jokes, memes, humor, etc. related to programming!\n\nFor sharing awful code theres also  [Programming Horror](https://programming.dev/c/programming_horror).\n\n## Rules\n- Keep content in english\n- No advertisements\n- Posts must be related to programming or programmer topics",
        removed: false,
        published: "2023-06-12T23:22:30.213448Z",
        updated: "2023-08-11T17:48:04.343031Z",
        deleted: false,
        nsfw: false,
        actor_id: "https://programming.dev/c/programmer_humor",
        local: false,
        icon: "https://programming.dev/pictrs/image/170721ad-9010-470f-a4a4-ead95f51f13b.png",
        banner:
          "https://programming.dev/pictrs/image/ab84fc81-cbba-4504-b55b-2c886fe2624f.png",
        hidden: false,
        posting_restricted_to_mods: false,
        instance_id: 516,
        visibility: "Public",
      },
      creator_banned_from_community: false,
      banned_from_community: false,
      creator_is_moderator: false,
      creator_is_admin: false,
      counts: {
        post_id: 37027413,
        comments: 18,
        score: 68,
        upvotes: 68,
        downvotes: 0,
        published: "2025-10-07T18:05:17.516473Z",
        newest_comment_time: "2025-10-08T16:28:23.165972Z",
      },
      subscribed: "NotSubscribed",
      saved: false,
      read: false,
      hidden: false,
      creator_blocked: false,
      unread_comments: 18,
    },
    {
      post: {
        id: 36639264,
        name: "PR: Linux.exe",
        url: "https://github.com/torvalds/linux/pull/1349",
        body: "![](https://lemmy.world/pictrs/image/c3348c61-8602-4b2e-87b7-009a660b1ac4.jpeg)",
        creator_id: 728017,
        community_id: 5825,
        removed: false,
        locked: false,
        published: "2025-09-29T12:23:35.250283Z",
        updated: "2025-09-29T12:24:51.410426Z",
        deleted: false,
        nsfw: false,
        embed_title:
          "I AM NEW TO GITHUB AND I HAVE ALOT TO SAY by danemadsen · Pull Request #1349 · torvalds/linux",
        embed_description:
          "I DONT GIVE A FUCK ABOUT THE FUCKING CODE! i just want to download this stupid fucking application and use it.\nhttps://github.com/torvalds/linux\nWHY IS THERE CODE??? MAKE A FUCKING .EXE FILE AND GI...",
        thumbnail_url:
          "https://lemmy.world/pictrs/image/2cbd44f7-77d2-40dd-9a4c-54d1cb871fc6.png",
        ap_id: "https://lemmy.world/post/36639264",
        local: true,
        language_id: 0,
        featured_community: false,
        featured_local: false,
        url_content_type: "text/html; charset=utf-8",
      },
      creator: {
        id: 728017,
        name: "n3cr0",
        display_name: "N3Cr0",
        banned: false,
        published: "2023-07-04T19:02:42.197083Z",
        actor_id: "https://lemmy.world/u/n3cr0",
        local: true,
        deleted: false,
        bot_account: false,
        instance_id: 1,
      },
      community: {
        id: 5825,
        name: "programmer_humor",
        title: "Programmer Humor",
        description:
          "Welcome to Programmer Humor!\n\nThis is a place where you can post jokes, memes, humor, etc. related to programming!\n\nFor sharing awful code theres also  [Programming Horror](https://programming.dev/c/programming_horror).\n\n## Rules\n- Keep content in english\n- No advertisements\n- Posts must be related to programming or programmer topics",
        removed: false,
        published: "2023-06-12T23:22:30.213448Z",
        updated: "2023-08-11T17:48:04.343031Z",
        deleted: false,
        nsfw: false,
        actor_id: "https://programming.dev/c/programmer_humor",
        local: false,
        icon: "https://programming.dev/pictrs/image/170721ad-9010-470f-a4a4-ead95f51f13b.png",
        banner:
          "https://programming.dev/pictrs/image/ab84fc81-cbba-4504-b55b-2c886fe2624f.png",
        hidden: false,
        posting_restricted_to_mods: false,
        instance_id: 516,
        visibility: "Public",
      },
      image_details: {
        link: "https://lemmy.world/pictrs/image/2cbd44f7-77d2-40dd-9a4c-54d1cb871fc6.png",
        width: 512,
        height: 256,
        content_type: "image/png",
      },
      creator_banned_from_community: false,
      banned_from_community: false,
      creator_is_moderator: false,
      creator_is_admin: false,
      counts: {
        post_id: 36639264,
        comments: 40,
        score: 106,
        upvotes: 129,
        downvotes: 23,
        published: "2025-09-29T12:23:35.250283Z",
        newest_comment_time: "2025-10-03T18:34:49.107961Z",
      },
      subscribed: "NotSubscribed",
      saved: false,
      read: false,
      hidden: false,
      creator_blocked: false,
      unread_comments: 40,
    },
    {
      post: {
        id: 36400486,
        name: "Linux Users",
        url: "https://lemmy.ml/pictrs/image/98d90c1a-1a91-4bf8-a155-d481c5c5659b.png",
        creator_id: 153590,
        community_id: 5825,
        removed: false,
        locked: false,
        published: "2025-09-24T14:18:25.308566Z",
        deleted: false,
        nsfw: false,
        thumbnail_url:
          "https://lemmy.world/pictrs/image/2f667b48-eaff-459e-8b56-291f8a22bf63.png",
        ap_id: "https://lemmy.world/post/36400486",
        local: true,
        language_id: 0,
        featured_community: false,
        featured_local: false,
        url_content_type: "image/png",
      },
      creator: {
        id: 153590,
        name: "cm0002",
        avatar:
          "https://lemmy.world/pictrs/image/61e0c4e5-de40-4742-b54e-f12bad365eb9.jpeg",
        banned: false,
        published: "2023-06-15T22:21:55.832210Z",
        actor_id: "https://lemmy.world/u/cm0002",
        bio: "https://lemmy.world/post/29072279",
        local: true,
        banner:
          "https://lemmy.world/pictrs/image/7caecc5d-1e73-4f4c-a93d-e84709dd1480.gif",
        deleted: false,
        bot_account: false,
        instance_id: 1,
      },
      community: {
        id: 5825,
        name: "programmer_humor",
        title: "Programmer Humor",
        description:
          "Welcome to Programmer Humor!\n\nThis is a place where you can post jokes, memes, humor, etc. related to programming!\n\nFor sharing awful code theres also  [Programming Horror](https://programming.dev/c/programming_horror).\n\n## Rules\n- Keep content in english\n- No advertisements\n- Posts must be related to programming or programmer topics",
        removed: false,
        published: "2023-06-12T23:22:30.213448Z",
        updated: "2023-08-11T17:48:04.343031Z",
        deleted: false,
        nsfw: false,
        actor_id: "https://programming.dev/c/programmer_humor",
        local: false,
        icon: "https://programming.dev/pictrs/image/170721ad-9010-470f-a4a4-ead95f51f13b.png",
        banner:
          "https://programming.dev/pictrs/image/ab84fc81-cbba-4504-b55b-2c886fe2624f.png",
        hidden: false,
        posting_restricted_to_mods: false,
        instance_id: 516,
        visibility: "Public",
      },
      image_details: {
        link: "https://lemmy.world/pictrs/image/2f667b48-eaff-459e-8b56-291f8a22bf63.png",
        width: 512,
        height: 336,
        content_type: "image/png",
      },
      creator_banned_from_community: false,
      banned_from_community: false,
      creator_is_moderator: false,
      creator_is_admin: false,
      counts: {
        post_id: 36400486,
        comments: 152,
        score: 1258,
        upvotes: 1285,
        downvotes: 27,
        published: "2025-09-24T14:18:25.308566Z",
        newest_comment_time: "2025-10-01T22:05:19.109738Z",
      },
      subscribed: "NotSubscribed",
      saved: false,
      read: false,
      hidden: false,
      creator_blocked: false,
      unread_comments: 152,
    },
  ],
  communities: [
    {
      community: {
        id: 37,
        name: "linux",
        title: "Linux",
        description:
          'From Wikipedia, the free encyclopedia\n\nLinux is a family of open source Unix-like operating systems based on the Linux kernel, an operating system kernel first released on September 17, 1991 by Linus Torvalds. Linux is typically packaged in a Linux distribution (or distro for short).\n\nDistributions include the Linux kernel and supporting system software and libraries, many of which are provided by the GNU Project. Many Linux distributions use the word "Linux" in their name, but the Free Software Foundation uses the name GNU/Linux to emphasize the importance of GNU software, causing some controversy.\n\n\n### Rules\n* Posts must be relevant to operating systems running the Linux kernel. GNU/Linux or otherwise.\n* No misinformation\n* No NSFW content\n* No hate speech, bigotry, etc \n\n### Related Communities\n* [!opensource@lemmy.ml](https://lemmy.ml/c/opensource)\n* [!libre_culture@lemmy.ml](https://lemmy.ml/c/libre_culture) \n* [!technology@lemmy.ml](https://lemmy.ml/c/technology) \n* [!libre_hardware@lemmy.ml](https://lemmy.ml/c/libre_hardware) \n\nCommunity icon by [Alpár-Etele Méder](https://www.iconfinder.com/pocike), licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)',
        removed: false,
        published: "2019-06-01T15:07:36.179766Z",
        updated: "2022-06-18T17:36:20.924834Z",
        deleted: false,
        nsfw: false,
        actor_id: "https://lemmy.ml/c/linux",
        local: false,
        icon: "https://lemmy.ml/pictrs/image/q98XK4sKtw.png",
        hidden: false,
        posting_restricted_to_mods: false,
        instance_id: 3,
        visibility: "Public",
      },
      subscribed: "NotSubscribed",
      blocked: false,
      counts: {
        community_id: 37,
        subscribers: 59769,
        posts: 8237,
        comments: 212073,
        published: "2019-06-01T15:07:36.179766Z",
        users_active_day: 599,
        users_active_week: 2349,
        users_active_month: 5710,
        users_active_half_year: 15169,
        subscribers_local: 14413,
      },
      banned_from_community: false,
    },
    {
      community: {
        id: 11684,
        name: "linuxmemes",
        title: "linuxmemes",
        description: "Hint: `:q!`",
        removed: false,
        published: "2023-06-15T20:22:32.340233Z",
        updated: "2025-04-01T03:50:19.256683Z",
        deleted: false,
        nsfw: false,
        actor_id: "https://lemmy.world/c/linuxmemes",
        local: true,
        icon: "https://lemmy.world/pictrs/image/4271bdc6-5114-4749-a5a9-afbc82a99c78.png",
        banner:
          "https://lemmy.world/pictrs/image/4701d6d0-a080-461e-8a33-5927dd1809e6.png",
        hidden: false,
        posting_restricted_to_mods: false,
        instance_id: 1,
        visibility: "Public",
      },
      subscribed: "NotSubscribed",
      blocked: false,
      counts: {
        community_id: 11684,
        subscribers: 28100,
        posts: 1905,
        comments: 111439,
        published: "2023-06-15T20:22:32.340233Z",
        users_active_day: 558,
        users_active_week: 3355,
        users_active_month: 7347,
        users_active_half_year: 17458,
        subscribers_local: 11650,
      },
      banned_from_community: false,
    },
    {
      community: {
        id: 8259,
        name: "linux_gaming",
        title: "Linux Gaming",
        description:
          "Discussions and news about gaming on the GNU/Linux family of operating systems.",
        removed: false,
        published: "2023-06-14T10:26:22.867411Z",
        updated: "2025-11-15T05:16:00.861705Z",
        deleted: false,
        nsfw: false,
        actor_id: "https://lemmy.world/c/linux_gaming",
        local: true,
        icon: "https://lemmy.world/pictrs/image/1f477879-f269-4fc2-805c-3cb0fe552f40.png",
        banner:
          "https://lemmy.world/pictrs/image/4d8b58ac-814f-425c-afd1-9e3573a35718.png",
        hidden: false,
        posting_restricted_to_mods: false,
        instance_id: 1,
        visibility: "Public",
      },
      subscribed: "NotSubscribed",
      blocked: false,
      counts: {
        community_id: 8259,
        subscribers: 22252,
        posts: 2143,
        comments: 27891,
        published: "2023-06-14T10:26:22.867411Z",
        users_active_day: 478,
        users_active_week: 2013,
        users_active_month: 5122,
        users_active_half_year: 10199,
        subscribers_local: 10013,
      },
      banned_from_community: false,
    },
  ],
  users: [],
};
