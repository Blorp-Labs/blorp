import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import z from "zod";

const USERNAME = faker.internet.username();
const JWT = "sdfkhsdkfjhsdfkjshdfksjdhfskjdhfskjhsfsdfsdkjfhs";

test("login", async ({ page }, testInfo) => {
  await page.route("**/data/instance.full.json", async (route) => {
    const mockPayload = [
      {
        name: "Lemmy.World",
        baseurl: "lemmy.world",
        url: "https://lemmy.world/",
        score: 1,
        open: true,
        private: false,
        counts: {
          users_active_month: 20000,
          posts: 100000,
        },
        tags: [],
        nsfw: false,
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
    const mockPayload = {
      site_view: {
        site: {
          id: 1,
          name: "Lemmy.World",
          sidebar:
            "The World's Internet Frontpage\nLemmy.World is a general-purpose Lemmy instance of various topics, for the entire world to use.\n\nBe polite and follow the rules ⚖ \nhttps://legal.lemmy.world/tos\n\n## Get started \nSee the [Getting Started Guide](https://support.lemmy.world/quickstart)\n\n## Donations 💗\nIf you would like to make a donation to support the cost of running this platform, please do so at the following donation URLs.\n\n**If you can, please use / switch to Ko-Fi, it has the lowest fees for us**\n\n[![Ko-Fi (Donate)](https://img.shields.io/badge/KoFi_Donate-FHFWorld-red?style=flat-square&logo=kofi&color=red)](https://ko-fi.com/fhfworld)\n\n[![Bunq (Donate)](https://img.shields.io/badge/Bunq_Donate-FHF-green?style=flat-square&logo=bunq&color=darkgreen)](https://bunq.me/fhf)\n\n[![Open Collective backers and sponsors](https://img.shields.io/opencollective/all/mastodonworld?style=flat-square&logo=opencollective&color=7FADF2)](https://opencollective.com/mastodonworld)\n\n[![Patreon](https://img.shields.io/badge/Patreon-MastodonWorld-green?style=flat-square&logo=patreon&color=lightblue)](https://patreon.com/mastodonworld)\n\n[![Liberapay patrons](https://img.shields.io/liberapay/patrons/fhf?style=flat-square&logo=liberapay)](https://en.liberapay.com/fhf)\n\n[![GitHub Sponsors](https://img.shields.io/github/sponsors/Fedihosting-Foundation?style=flat-square&logo=github&label=Sponsors)](https://github.com/sponsors/Fedihosting-Foundation)\n\n## Join the team 😎\n[Check out our team page to join](https://fedihosting.foundation/positions/)\n\n## Questions / Issues \n- Questions/issues post to [![Lemmy](https://img.shields.io/lemmy/support%40lemmy.world?style=flat-square&logo=lemmy&label=support%40lemmy.world&color=pink)](https://lemmy.world/c/support) \n- To open a ticket [![Static Badge](https://img.shields.io/badge/email-info%40lemmy.world-green?style=flat-square&logo=mailgun&color=blue)](mailto:info@lemmy.world)\n- Reporting is to be done via the reporting button under a post/comment.\n- [Additional Report Info HERE](https://legal.lemmy.world/bylaws/#25-content-reporting)\n\n- [Please note, you will NOT be able to comment or post while on a VPN or Tor connection](https://lemmy.world/post/11967676)\n\n## More Lemmy.World\n### Follow us for server news 🐘\n[![Mastodon Follow](https://img.shields.io/mastodon/follow/110952393950540579?domain=https%3A%2F%2Fmastodon.world&style=flat-square&logo=mastodon&color=6364FF)](https://mastodon.world/@LemmyWorld)\n\n### Chat 🗨\n[![Discord](https://img.shields.io/discord/1120387349864534107?style=flat-square&logo=discord&color=565EAE)](https://discord.gg/lemmyworld)\n\n[![Matrix](https://img.shields.io/matrix/lemmy.world_general%3Amatrix.org?style=flat-square&logo=matrix&color=blue)](https://matrix.to/#/#general:lemmy.world)\n\n## Alternative UIs\n- [https://a.lemmy.world/](https://a.lemmy.world/) - Alexandrite UI\n- [https://photon.lemmy.world/](https://photon.lemmy.world/) - Photon UI\n- [https://m.lemmy.world/](https://m.lemmy.world/) - Voyager mobile UI\n- [https://old.lemmy.world/](https://old.lemmy.world/) - A familiar UI\n\n## Monitoring / Stats 🌐\n\n### Service Status 🔥\n#### https://status.lemmy.world/\n\n[![](https://lemmy-status.org/api/v1/endpoints/_lemmy-world/uptimes/24h/badge.svg)](https://lemmy-status.org/endpoints/_lemmy-world)\n\n[![](https://lemmy-status.org/api/v1/endpoints/_lemmy-world/uptimes/7d/badge.svg)](https://lemmy-status.org/endpoints/_lemmy-world)\n\n[![Mozilla HTTP Observatory Grade](https://img.shields.io/mozilla-observatory/grade/lemmy.world)](https://observatory.mozilla.org/analyze/lemmy.world)\n\n[![](https://lemmy-status.org/api/v1/endpoints/_lemmy-world/response-times/7d/badge.svg)](https://lemmy-status.org/endpoints/_lemmy-world)\n\n[![](https://lemmy-status.org/api/v1/endpoints/_lemmy-world/response-times/24h/badge.svg)](https://lemmy-status.org/endpoints/_lemmy-world)\n\n[![](https://fediseer.com/api/v1/badges/endorsements/lemmy.world.svg)](https://gui.fediseer.com/instances/detail/lemmy.world)\n\nLemmy.World is part of the [FediHosting Foundation](https://fedihosting.foundation/)\n\n[![](https://img.shields.io/badge/92291619-blue?style=flat-square&label=%F0%9F%94%8D+FediHosting+Foundation&color=blue)](https://www.oozo.nl/bedrijven/breda/breda-noord-west/muizenberg/3177475/fedihosting-foundation-stichting)\n\n[![](https://lemmy.world/pictrs/image/27c30ddd-f9f4-4de6-ab57-18b43395833a.png)](https://dash.lemmy.world/)",
          published: "2023-06-01T07:01:46.127298Z",
          updated: "2025-07-05T21:07:52.487451Z",
          icon: "https://lemmy.world/pictrs/image/0fd47927-ca3a-4d2c-b2e4-a25353786671.png",
          banner:
            "https://lemmy.world/pictrs/image/d22b2935-f27b-49f0-81e7-c81c21088467.png",
          description: "A generic Lemmy server for everyone to use.",
          actor_id: "https://lemmy.world/",
          last_refreshed_at: "2023-06-01T07:01:46.123867Z",
          inbox_url: "https://lemmy.world/inbox",
          public_key: "",
          instance_id: 1,
        },
        local_site: {
          id: 1,
          site_id: 1,
          site_setup: true,
          enable_downvotes: true,
          enable_nsfw: true,
          community_creation_admin_only: false,
          require_email_verification: true,
          application_question: "",
          private_instance: false,
          default_theme: "darkly-pureblack",
          default_post_listing_type: "All",
          legal_information: "",
          hide_modlog_mod_names: false,
          application_email_admins: false,
          slur_filter_regex: "",
          actor_name_max_length: 26,
          federation_enabled: true,
          captcha_enabled: true,
          captcha_difficulty: "hard",
          published: "2023-06-01T07:01:46.267237Z",
          updated: "2025-07-05T21:07:52.488702Z",
          registration_mode: "RequireApplication",
          reports_email_admins: false,
          federation_signed_fetch: true,
          default_post_listing_mode: "List",
          default_sort_type: "Active",
        },
        local_site_rate_limit: {
          local_site_id: 1,
          message: 999,
          message_per_second: 60,
          post: 999,
          post_per_second: 60,
          register: 20,
          register_per_second: 300,
          image: 50,
          image_per_second: 3600,
          comment: 999,
          comment_per_second: 60,
          search: 100,
          search_per_second: 600,
          published: "2023-06-01T07:01:46.283919Z",
          import_user_settings: 1,
          import_user_settings_per_second: 86400,
        },
        counts: {
          site_id: 1,
          users: 177887,
          posts: 538889,
          comments: 5102780,
          communities: 12450,
          users_active_day: 6461,
          users_active_week: 10883,
          users_active_month: 15751,
          users_active_half_year: 29711,
        },
      },
      admins: [],
      version: "0.19.12-4-gd8445881a",
      my_user: {
        local_user_view: {
          local_user: {
            id: 186300,
            person_id: 123,
            email: "lemmy@sy3ru8day9.com",
            show_nsfw: false,
            theme: "browser",
            default_sort_type: "Active",
            default_listing_type: "All",
            interface_language: "browser",
            show_avatars: true,
            send_notifications_to_email: false,
            show_scores: false,
            show_bot_accounts: true,
            show_read_posts: true,
            email_verified: true,
            accepted_application: true,
            open_links_in_new_tab: false,
            blur_nsfw: true,
            auto_expand: false,
            infinite_scroll_enabled: false,
            admin: false,
            post_listing_mode: "List",
            totp_2fa_enabled: true,
            enable_keyboard_navigation: false,
            enable_animated_images: true,
            collapse_bot_comments: false,
            last_donation_notification: "2025-02-21T19:05:54.308310Z",
          },
          local_user_vote_display_mode: {
            local_user_id: 186300,
            score: false,
            upvotes: true,
            downvotes: true,
            upvote_percentage: false,
          },
          person: {
            id: 123,
            name: USERNAME,
            avatar:
              "https://lemmy.world/pictrs/image/b4ba13ea-9e00-4f68-a98a-db313ffb84f8.jpeg",
            banned: false,
            published: "2024-10-06T15:23:42.825174Z",
            actor_id: `https://lemmy.world/u/${USERNAME}`,
            bio: "",
            local: true,
            deleted: false,
            bot_account: false,
            instance_id: 1,
          },
          counts: {
            person_id: 123,
            post_count: 25,
            comment_count: 429,
          },
        },
        follows: [],
        moderates: [],
        community_blocks: [],
        instance_blocks: [],
        person_blocks: [],
        discussion_languages: [],
      },
      all_languages: [],
      discussion_languages: [],
      taglines: [],
      custom_emojis: [],
      blocked_urls: [],
    };
    if (!loggedIn) {
      // @ts-expect-error
      delete mockPayload.my_user;
      mockPayload.site_view.site.sidebar = "123";
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPayload),
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
