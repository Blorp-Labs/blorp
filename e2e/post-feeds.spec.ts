import { test, expect } from "@playwright/test";

const tabs = [
  { name: "home", base: "/home/" },
  { name: "communities", base: "/communities/" },
  { name: "inbox", base: "/inbox/" },
] as const;

for (const { name, base } of tabs) {
  test.describe(`${name}‑tab tests`, () => {
    test("loads community feed", async ({ page }) => {
      await page.goto(`${base}c/asklemmy@lemmy.ml`);
      const postCard = page.getByTestId("post-card").first();
      // TODO: find something else to assert for here
      // We no longer render the community slug since you
      // already know you're in that community
      //await expect(postCard).toContainText("asklemmy@lemmy.ml");
    });

    test("loads user feed", async ({ page }) => {
      await page.goto(
        `${base}u/https%3A%2F%2Flemmy.world%2Fu%2FThe_Picard_Maneuver?type=posts`,
      );
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toBeVisible();
    });

    test("loads search results", async ({ page }) => {
      await page.goto(`${base}s?q=linux+phone`);
      const postCard = page
        .getByTestId(base === "/communities/" ? "community-card" : "post-card")
        .first();
      await expect(postCard).toContainText("linux", {
        ignoreCase: true,
      });
    });

    test("loads community search results", async ({ page }) => {
      await page.route("**/data/instance.full.json", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SEARCH_RES),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        });
      });
      await page.goto(`${base}c/programmer_humor@programming.dev/s?q=linux`);
      const postCard = page.getByTestId("post-card").first();
      await expect(postCard).toContainText("programmer_humor@programming.dev");
    });
  });
}

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
        published: "2025-09-24T14:18:25.308556Z",
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
        published: "2025-09-24T14:18:25.308556Z",
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
  communities: [],
  users: [],
};
