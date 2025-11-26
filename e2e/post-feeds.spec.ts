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
      await page.route("**/api/v3/search*", async (route) => {
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
      await page.goto(`${base}s?q=linux+phone`);
      const postCard = page
        .getByTestId(base === "/communities/" ? "community-card" : "post-card")
        .first();
      await expect(postCard).toContainText("linux", {
        ignoreCase: true,
      });
    });

    test("loads community search results", async ({ page }) => {
      await page.route("**/api/v3/search*", async (route) => {
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
        description:
          "Hint: `:q!`\n\n----\n\n\n::: spoiler Sister communities:\n* !tech_memes@lemmy.world\n* !memes@lemmy.world\n* !lemmyshitpost@lemmy.world\n* !risa@startrek.website\n:::\n\n---\n\nCommunity rules (click to expand)\n:::spoiler 1. Follow the site-wide rules\n- Instance-wide TOS: https://legal.lemmy.world/tos/\n- Lemmy code of conduct: https://join-lemmy.org/docs/code_of_conduct.html\n:::\n:::spoiler 2. Be civil\n- Understand the difference between a joke and an insult.\n- Do not harrass or attack users *for any reason*. This includes using blanket terms, like \"every user of *thing*\".\n- Don't get baited into back-and-forth insults. We are not animals.\n- Leave remarks of \"peasantry\" to the PCMR community. If you dislike an OS/service/application, attack the *thing* you dislike, not the individuals who use it. Some people may not have a choice.\n- Bigotry will not be tolerated.\n:::\n::: spoiler 3. Post Linux-related content\n- Including Unix and BSD.\n- Non-Linux content is acceptable as long as it makes a reference to Linux. For example, the poorly made mockery of `sudo` in Windows.\n- No porn, no politics, no trolling or ragebaiting.\n:::\n:::spoiler 4. No recent reposts\n- Everybody uses Arch btw, can't quit Vim, <loves/tolerates/hates> systemd, and wants to interject for a moment. You can stop now.\n:::\n:::spoiler 5. 🇬🇧 Language/язык/Sprache\n- **This is primarily an English-speaking community.** 🇬🇧🇦🇺🇺🇸\n- Comments written in other languages are allowed.\n- The substance of a post should be comprehensible for people who only speak English.\n- Titles and post bodies written in other languages will be allowed, but only as long as the above rule is observed.\n:::\n:::spoiler 6. (NEW!) Regarding public figures\nWe all have our opinions, and certain public figures can be divisive. Keep in mind that **this is a community for memes and light-hearted fun**, not for airing grievances or leveling accusations.\n- Keep discussions polite and free of disparagement.\n- We are never in possession of all of the facts. Defamatory comments will not be tolerated.\n- Discussions that get too heated will be locked and offending comments removed.\n:::\n&nbsp;\n\nPlease report posts and comments that break these rules!\n\n---\n**Important: never execute code or follow advice that you don't understand or can't verify**, especially here. The word of the day is *credibility*. This is a meme community -- even the most helpful comments might just be shitposts that can damage your system. Be aware, be smart, don't remove France.",
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
          "Discussions and news about gaming on the GNU/Linux family of operating systems (including the Steam Deck). Potentially a `$HOME` away from home for disgruntled /r/linux_gaming denizens of the redditarian demesne.\n\nThis page can be subscribed to via RSS.\n\nOriginal /r/linux_gaming pengwing by uoou.\n\nNo memes/shitposts/low-effort posts, please.\n\n# Resources\n\n**WWW:**\n\n* [Linux Gaming wiki](https://linux-gaming.kwindu.eu/index.php)\n* [Gaming on Linux](https://www.gamingonlinux.com/)\n* [ProtonDB](https://www.protondb.com/)\n* [Lutris](https://lutris.net/)\n* [PCGamingWiki](http://pcgamingwiki.com/wiki/Home)\n* [LibreGameWiki](https://libregamewiki.org/Main_Page)\n* [Boiling Steam](https://boilingsteam.com/)\n* [Phoronix](https://www.phoronix.com/)\n* [Linux VR Adventures](https://lvra.gitlab.io/)\n\n**Discord:**\n\n* [Gaming on Linux](https://discord.gg/xAPJFX54Ex)\n* [Linux Gamers Group](https://discord.gg/BaWqd4r)\n* [Linux Gaming](https://discord.gg/UqenWumc9p)\n* [Lutris](https://discord.gg/8mzUKZepG9)\n\n**IRC:**\n\n* [Gaming on Linux](https://www.gamingonlinux.com/irc/)\n\n**Matrix:**\n\n* [Linux Gamers Group (space)](https://matrix.to/#/!yTNaIjgcibeYZIpsQi:matrix.org) \n* [Linux Gamers Group (“home” room)](https://matrix.to/#/!cZCRCLmQmHAGnBqmIE:matrix.org)\n* [Linux Gaming](https://matrix.to/#/#linux_gaming:matrix.org)\n\n**Telegram:**\n\n* [Gaming on Linux](https://t.me/linux_gaming)",
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
