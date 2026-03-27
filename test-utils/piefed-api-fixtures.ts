/**
 * Shared mock API response fixtures for piefed Playwright e2e tests.
 *
 * Each fixture uses `satisfies` against the corresponding
 * @blorp-labs/piefed-api-client type so that TypeScript will catch any fields
 * that fall out of sync with the upstream API schema.
 */
import type {
  CommunityAggregates,
  CommunityView,
  FeedView,
  FeedListResponse,
  GetCommunityResponse,
  GetPostResponse,
  GetPostRepliesResponse,
  GetSiteResponse,
  GetUserResponse,
  ListCommunitiesResponse,
  ListPostsResponse,
  ResolveObjectResponse,
  SearchResponse,
  Comment,
  CommentAggregates,
  PostReplyView,
  Post,
  PostAggregates,
  PostView,
  Person,
  PersonView,
  Community,
} from "@blorp-labs/piefed-api-client";

// ---------------------------------------------------------------------------
// Shared sub-objects reused across multiple fixtures
// ---------------------------------------------------------------------------

const FEED_COMMUNITY = {
  id: 10,
  name: "technology",
  title: "Technology",
  actor_id: "https://piefed.social/c/technology",
  published: "2023-01-01T00:00:00.000000Z",
  instance_id: 5,
  deleted: false,
  hidden: false,
  local: true,
  nsfw: false,
  ai_generated: false,
  removed: false,
  restricted_to_mods: false,
} satisfies Community;

export const FEED_OWNER = {
  id: 500,
  user_name: "feed_owner",
  actor_id: "https://piefed.social/u/feed_owner",
  published: "2023-06-01T00:00:00.000000Z",
  instance_id: 5,
  banned: false,
  bot: false,
  deleted: false,
  local: true,
} satisfies Person;

export const FEED_OWNER_VIEW = {
  person: FEED_OWNER,
  counts: {
    person_id: 500,
    post_count: 10,
    comment_count: 20,
  },
  is_admin: false,
  activity_alert: false,
} satisfies PersonView;

export const PIEFED_FEED = {
  id: 42,
  actor_id: "https://piefed.social/f/42",
  ap_domain: "piefed.social",
  name: "tech-news",
  title: "Tech News",
  published: "2023-07-01T00:00:00.000000Z",
  updated: "2024-01-01T00:00:00.000000Z",
  user_id: 500,
  nsfw: false,
  nsfl: false,
  subscriptions_count: 100,
  communities_count: 3,
  communities: [FEED_COMMUNITY],
  children: [],
  is_instance_feed: false,
  local: true,
  owner: false,
  public: true,
  show_posts_from_children: false,
  subscribed: false,
} satisfies FeedView;

// ---------------------------------------------------------------------------
// GET /api/alpha/resolve_object
// ---------------------------------------------------------------------------

export const RESOLVE_FEED_RES = {
  feed: PIEFED_FEED,
} satisfies ResolveObjectResponse;

// ---------------------------------------------------------------------------
// GET /api/alpha/feed (single feed detail — returns FeedView directly)
// ---------------------------------------------------------------------------

export const GET_FEED_RES = PIEFED_FEED satisfies FeedView;

// ---------------------------------------------------------------------------
// GET /api/alpha/feed/list
// ---------------------------------------------------------------------------

export const GET_FEED_LIST_RES = {
  feeds: [PIEFED_FEED],
} satisfies FeedListResponse;

// ---------------------------------------------------------------------------
// Piefed post fixtures
// ---------------------------------------------------------------------------

const PIEFED_POST_CREATOR = {
  id: 600,
  user_name: "piefed_user",
  actor_id: "https://piefed.social/u/piefed_user",
  published: "2023-01-01T00:00:00.000000Z",
  instance_id: 5,
  banned: false,
  bot: false,
  deleted: false,
  local: true,
} satisfies Person;

const PIEFED_POST = {
  id: 99001,
  title: "Exciting new developments in open source software",
  ap_id: "https://piefed.social/post/99001",
  community_id: 10,
  user_id: 600,
  published: "2024-03-01T10:00:00.000000Z",
  language_id: 37,
  local: true,
  locked: false,
  deleted: false,
  removed: false,
  nsfw: false,
  ai_generated: false,
  sticky: false,
  instance_sticky: false,
  post_type: "Discussion" as const,
} satisfies Post;

const PIEFED_POST_COUNTS = {
  post_id: 99001,
  score: 42,
  upvotes: 45,
  downvotes: 3,
  comments: 7,
  cross_posts: 0,
  published: "2024-03-01T10:00:00.000000Z",
  newest_comment_time: "2024-03-01T12:00:00.000000Z",
} satisfies PostAggregates;

const PIEFED_POST_VIEW = {
  post: PIEFED_POST,
  creator: PIEFED_POST_CREATOR,
  community: FEED_COMMUNITY,
  counts: PIEFED_POST_COUNTS,
  creator_banned_from_community: false,
  creator_is_admin: false,
  creator_is_moderator: false,
  banned_from_community: false,
  hidden: false,
  read: false,
  saved: false,
  subscribed: "NotSubscribed" as const,
  unread_comments: 7,
} satisfies PostView;

// ---------------------------------------------------------------------------
// GET /api/alpha/post/list (feed posts)
// ---------------------------------------------------------------------------

export const GET_FEED_POSTS_RES = {
  posts: [PIEFED_POST_VIEW],
} satisfies ListPostsResponse;

// ---------------------------------------------------------------------------
// GET /api/alpha/post (single post)
// ---------------------------------------------------------------------------

export const GET_POST_RES = {
  post_view: PIEFED_POST_VIEW,
} satisfies GetPostResponse;

// GET /api/alpha/resolve_object — resolves a post AP ID to its local object
export const RESOLVE_POST_RES = {
  post: PIEFED_POST_VIEW,
} satisfies ResolveObjectResponse;

// POST /api/alpha/post/like — returned after a successful vote
export const POST_LIKE_RES = {
  post_view: {
    ...PIEFED_POST_VIEW,
    my_vote: 1,
    counts: { ...PIEFED_POST_COUNTS, score: 43, upvotes: 46 },
  },
} satisfies GetPostResponse;

// ---------------------------------------------------------------------------
// GET /api/alpha/comment/list (post comments)
// ---------------------------------------------------------------------------

const PIEFED_COMMENT_CREATOR = {
  id: 700,
  user_name: "piefed_commenter",
  actor_id: "https://piefed.social/u/piefed_commenter",
  published: "2023-01-01T00:00:00.000000Z",
  instance_id: 5,
  banned: false,
  bot: false,
  deleted: false,
  local: true,
} satisfies Person;

const PIEFED_COMMENT = {
  id: 8001,
  body: "I've been really enjoying the new Linux kernel updates lately.",
  ap_id: "https://piefed.social/comment/8001",
  path: "0.8001",
  post_id: 99001,
  user_id: 700,
  published: "2024-03-01T11:00:00.000000Z",
  language_id: 37,
  local: true,
  deleted: false,
  removed: false,
} satisfies Comment;

const PIEFED_COMMENT_VIEW = {
  comment: PIEFED_COMMENT,
  creator: PIEFED_COMMENT_CREATOR,
  post: PIEFED_POST,
  community: FEED_COMMUNITY,
  counts: {
    comment_id: 8001,
    score: 10,
    upvotes: 11,
    downvotes: 1,
    child_count: 0,
    published: "2024-03-01T11:00:00.000000Z",
  } satisfies CommentAggregates,
  activity_alert: false,
  banned_from_community: false,
  creator_banned_from_community: false,
  creator_blocked: false,
  creator_is_admin: false,
  creator_is_moderator: false,
  saved: false,
  subscribed: "NotSubscribed" as const,
} satisfies PostReplyView;

// GET /api/alpha/post/replies — comments on a post
export const GET_POST_REPLIES_RES = {
  comments: [PIEFED_COMMENT_VIEW],
} satisfies GetPostRepliesResponse;

// ---------------------------------------------------------------------------
// Community fixtures
// ---------------------------------------------------------------------------

const PIEFED_COMMUNITY_VIEW = {
  community: FEED_COMMUNITY,
  counts: {
    id: 10,
    post_count: 500,
    post_reply_count: 2000,
    published: "2023-01-01T00:00:00.000000Z",
    subscriptions_count: 5000,
    total_subscriptions_count: 5500,
  } satisfies CommunityAggregates,
  activity_alert: false,
  blocked: false,
  subscribed: "NotSubscribed" as const,
} satisfies CommunityView;

// GET /api/alpha/community
export const GET_COMMUNITY_RES = {
  community_view: PIEFED_COMMUNITY_VIEW,
  discussion_languages: [],
  moderators: [],
} satisfies GetCommunityResponse;

// GET /api/alpha/community/list
export const LIST_COMMUNITIES_RES = {
  communities: [PIEFED_COMMUNITY_VIEW],
} satisfies ListCommunitiesResponse;

// ---------------------------------------------------------------------------
// User fixture
// ---------------------------------------------------------------------------

// GET /api/alpha/resolve_object — resolves a user AP ID to a local person
export const RESOLVE_PERSON_RES = {
  person: FEED_OWNER_VIEW,
} satisfies ResolveObjectResponse;

// GET /api/alpha/user
export const GET_USER_RES = {
  person_view: FEED_OWNER_VIEW,
  posts: [PIEFED_POST_VIEW],
  comments: [],
  moderates: [],
} satisfies GetUserResponse;

// ---------------------------------------------------------------------------
// Search fixture
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Site fixture
// ---------------------------------------------------------------------------

// GET /api/alpha/site — returned when logged in; omit my_user for logged-out
export const PIEFED_SITE_WITH_USER = {
  admins: [],
  site: {
    actor_id: "https://piefed.social",
    name: "PieFed",
  },
  version: "1.6.0",
  my_user: {
    local_user_view: {
      person: FEED_OWNER,
      counts: {
        person_id: 500,
        post_count: 10,
        comment_count: 20,
      },
      local_user: {
        accept_private_messages: "All" as const,
        ai_visibility: "Show" as const,
        bot_visibility: "Show" as const,
        default_comment_sort_type: "Hot" as const,
        default_listing_type: "All" as const,
        email_unread: false,
        federate_votes: true,
        feed_auto_follow: false,
        feed_auto_leave: false,
        hide_low_quality: false,
        indexable: true,
        newsletter: false,
        nsfl_visibility: "Hide" as const,
        nsfw_visibility: "Hide" as const,
        reply_collapse_threshold: -10,
        reply_hide_threshold: -100,
        searchable: true,
        show_bot_accounts: true,
        show_nsfl: false,
        show_nsfw: false,
        show_read_posts: true,
        show_scores: true,
      },
    },
    community_blocks: [],
    discussion_languages: [],
    follows: [],
    instance_blocks: [],
    moderates: [],
    person_blocks: [],
  },
} satisfies GetSiteResponse;

// ---------------------------------------------------------------------------
// Search fixture
// ---------------------------------------------------------------------------

// GET /api/alpha/search
export const SEARCH_RES = {
  type_: "Posts" as const,
  posts: [PIEFED_POST_VIEW],
  communities: [PIEFED_COMMUNITY_VIEW],
  users: [],
  comments: [],
} satisfies SearchResponse;
