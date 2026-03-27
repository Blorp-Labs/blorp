/**
 * Shared mock API response fixtures for Playwright e2e tests.
 *
 * Each fixture uses `satisfies` against the corresponding lemmy-js-client
 * response type so that TypeScript will catch any fields that fall out of sync
 * with the upstream API schema.
 */
import type {
  Community,
  CommunityAggregates,
  CommunityView,
  Person,
  PersonAggregates,
  PersonView,
  Post,
  PostAggregates,
  PostView,
  CommentView,
  GetPostResponse,
  GetPostsResponse,
  GetPersonDetailsResponse,
  GetCommentsResponse,
  GetCommunityResponse,
  GetSiteResponse,
  ListCommunitiesResponse,
  PostResponse,
  ResolveObjectResponse,
} from "lemmy-v3";

// ---------------------------------------------------------------------------
// Shared sub-objects reused across multiple fixtures
// ---------------------------------------------------------------------------

const ASKLEMMY_COMMUNITY = {
  id: 1,
  name: "asklemmy",
  title: "AskLemmy",
  description: "The original community for asking Lemmy questions",
  actor_id: "https://lemmy.ml/c/asklemmy",
  published: "2019-06-01T15:07:36.179766Z",
  instance_id: 3,
  removed: false,
  deleted: false,
  nsfw: false,
  local: false,
  hidden: false,
  posting_restricted_to_mods: false,
  visibility: "Public" as const,
} satisfies Community;

const ASKLEMMY_COMMUNITY_COUNTS = {
  community_id: 1,
  subscribers: 10000,
  posts: 1000,
  comments: 50000,
  published: "2019-06-01T15:07:36.179766Z",
  users_active_day: 100,
  users_active_week: 500,
  users_active_month: 2000,
  users_active_half_year: 5000,
  subscribers_local: 5000,
} satisfies CommunityAggregates;

const POST_CREATOR = {
  id: 1001,
  name: "example_user",
  actor_id: "https://lemmy.world/u/example_user",
  published: "2022-01-01T00:00:00.000000Z",
  instance_id: 1,
  banned: false,
  deleted: false,
  bot_account: false,
  local: true,
} satisfies Person;

const TV_POST = {
  id: 23863920,
  name: "What TV shows are you watching and would recommend?",
  creator_id: 1001,
  community_id: 1,
  ap_id: "https://lemmy.world/post/23863920",
  published: "2024-01-15T12:00:00.000000Z",
  removed: false,
  locked: false,
  deleted: false,
  nsfw: false,
  local: true,
  language_id: 37,
  featured_community: false,
  featured_local: false,
} satisfies Post;

const TV_POST_COUNTS = {
  post_id: 23863920,
  comments: 42,
  score: 150,
  upvotes: 155,
  downvotes: 5,
  published: "2024-01-15T12:00:00.000000Z",
  newest_comment_time: "2024-01-15T18:00:00.000000Z",
} satisfies PostAggregates;

const TV_POST_VIEW = {
  post: TV_POST,
  creator: POST_CREATOR,
  community: ASKLEMMY_COMMUNITY,
  creator_banned_from_community: false,
  banned_from_community: false,
  creator_is_moderator: false,
  creator_is_admin: false,
  counts: TV_POST_COUNTS,
  subscribed: "NotSubscribed" as const,
  saved: false,
  read: false,
  hidden: false,
  creator_blocked: false,
  unread_comments: 42,
} satisfies PostView;

const ASKLEMMY_COMMUNITY_VIEW = {
  community: ASKLEMMY_COMMUNITY,
  subscribed: "NotSubscribed" as const,
  blocked: false,
  banned_from_community: false,
  counts: ASKLEMMY_COMMUNITY_COUNTS,
} satisfies CommunityView;

// ---------------------------------------------------------------------------
// GET /post
// ---------------------------------------------------------------------------

export const GET_POST_RES = {
  post_view: TV_POST_VIEW,
  community_view: ASKLEMMY_COMMUNITY_VIEW,
  moderators: [],
  cross_posts: [],
} satisfies GetPostResponse;

// POST /post/like — returned after a successful vote
export const POST_LIKE_RES = {
  post_view: {
    ...TV_POST_VIEW,
    my_vote: 1,
    counts: { ...TV_POST_COUNTS, score: 151, upvotes: 156 },
  },
} satisfies PostResponse;

// ---------------------------------------------------------------------------
// GET /post/list
// ---------------------------------------------------------------------------

export const GET_POSTS_RES = {
  posts: [TV_POST_VIEW],
} satisfies GetPostsResponse;

// ---------------------------------------------------------------------------
// GET /comment/list
// ---------------------------------------------------------------------------

const COMMENT_CREATOR = {
  id: 2001,
  name: "commenter",
  actor_id: "https://lemmy.world/u/commenter",
  published: "2022-06-01T00:00:00.000000Z",
  instance_id: 1,
  banned: false,
  deleted: false,
  bot_account: false,
  local: true,
} satisfies Person;

const TV_COMMENT = {
  comment: {
    id: 9001,
    creator_id: 2001,
    post_id: 23863920,
    content: "Breaking Bad and Better Call Saul are both excellent choices.",
    ap_id: "https://lemmy.world/comment/9001",
    path: "0.9001",
    published: "2024-01-15T13:00:00.000000Z",
    removed: false,
    deleted: false,
    local: true,
    distinguished: false,
    language_id: 37,
  },
  creator: COMMENT_CREATOR,
  post: TV_POST,
  community: ASKLEMMY_COMMUNITY,
  counts: {
    comment_id: 9001,
    score: 25,
    upvotes: 26,
    downvotes: 1,
    published: "2024-01-15T13:00:00.000000Z",
    child_count: 0,
  },
  creator_banned_from_community: false,
  banned_from_community: false,
  creator_is_moderator: false,
  creator_is_admin: false,
  subscribed: "NotSubscribed" as const,
  saved: false,
  creator_blocked: false,
} satisfies CommentView;

export const GET_COMMENTS_RES = {
  comments: [TV_COMMENT],
} satisfies GetCommentsResponse;

// ---------------------------------------------------------------------------
// GET /community
// ---------------------------------------------------------------------------

export const GET_COMMUNITY_RES = {
  community_view: ASKLEMMY_COMMUNITY_VIEW,
  moderators: [],
  discussion_languages: [],
} satisfies GetCommunityResponse;

// ---------------------------------------------------------------------------
// GET /resolve_object (person)
// ---------------------------------------------------------------------------

const PICARD = {
  id: 123,
  name: "The_Picard_Maneuver",
  actor_id: "https://lemmy.world/u/The_Picard_Maneuver",
  published: "2023-01-01T00:00:00.000000Z",
  instance_id: 1,
  banned: false,
  deleted: false,
  bot_account: false,
  local: true,
} satisfies Person;

const PICARD_VIEW = {
  person: PICARD,
  counts: {
    person_id: 123,
    post_count: 100,
    comment_count: 500,
  } satisfies PersonAggregates,
  is_admin: false,
} satisfies PersonView;

export const RESOLVE_PERSON_RES = {
  person: PICARD_VIEW,
} satisfies ResolveObjectResponse;

// ---------------------------------------------------------------------------
// GET /community/list
// ---------------------------------------------------------------------------

export const GET_COMMUNITIES_RES = {
  communities: [ASKLEMMY_COMMUNITY_VIEW],
} satisfies ListCommunitiesResponse;

// ---------------------------------------------------------------------------
// GET /user (GetPersonDetails)
// ---------------------------------------------------------------------------

export const GET_PERSON_DETAILS_RES = {
  person_view: PICARD_VIEW,
  posts: [TV_POST_VIEW],
  comments: [],
  moderates: [],
} satisfies GetPersonDetailsResponse;

// ---------------------------------------------------------------------------
// GET /site — includes my_user so useRefreshAuth doesn't log the account out
// ---------------------------------------------------------------------------

export const SITE_WITH_USER = {
  site_view: {
    site: {
      id: 1,
      name: "Lemmy.World",
      published: "2023-06-01T07:01:46.127298Z",
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
      enable_nsfw: false,
      community_creation_admin_only: false,
      require_email_verification: false,
      private_instance: false,
      default_theme: "browser",
      default_post_listing_type: "All",
      legal_information: "",
      hide_modlog_mod_names: false,
      application_email_admins: false,
      actor_name_max_length: 26,
      federation_enabled: true,
      captcha_enabled: false,
      captcha_difficulty: "easy",
      published: "2023-06-01T07:01:46.267238Z",
      registration_mode: "Open",
      reports_email_admins: false,
      federation_signed_fetch: false,
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
      published: "2023-06-01T07:01:46.283929Z",
      import_user_settings: 1,
      import_user_settings_per_second: 86400,
    },
    counts: {
      site_id: 1,
      users: 100,
      posts: 100,
      comments: 100,
      communities: 10,
      users_active_day: 10,
      users_active_week: 50,
      users_active_month: 100,
      users_active_half_year: 100,
    },
  },
  admins: [],
  version: "0.19.12",
  my_user: {
    local_user_view: {
      local_user: {
        id: 1,
        person_id: 123,
        show_nsfw: false,
        theme: "browser",
        default_sort_type: "Active",
        default_listing_type: "All",
        interface_language: "browser",
        show_avatars: true,
        send_notifications_to_email: false,
        show_scores: true,
        show_bot_accounts: true,
        show_read_posts: true,
        email_verified: true,
        accepted_application: true,
        open_links_in_new_tab: false,
        blur_nsfw: false,
        auto_expand: false,
        infinite_scroll_enabled: true,
        admin: false,
        post_listing_mode: "List",
        totp_2fa_enabled: false,
        enable_keyboard_navigation: false,
        enable_animated_images: true,
        collapse_bot_comments: false,
        last_donation_notification: "2024-01-01T00:00:00.000000Z",
      },
      local_user_vote_display_mode: {
        local_user_id: 1,
        score: true,
        upvotes: false,
        downvotes: false,
        upvote_percentage: false,
      },
      person: {
        id: 123,
        name: "test_user",
        actor_id: "https://lemmy.world/u/test_user",
        published: "2024-01-01T00:00:00.000000Z",
        banned: false,
        deleted: false,
        bot_account: false,
        instance_id: 1,
        local: true,
      },
      counts: {
        person_id: 123,
        post_count: 0,
        comment_count: 0,
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
} satisfies GetSiteResponse;
