import _ from "lodash";
import {
  ApiBlueprint,
  Errors,
  Forms,
  INIT_PAGE_TOKEN,
  RequestOptions,
  resolveObjectResponseSchema,
  Schemas,
  Software,
} from "./api-blueprint";
import z from "zod";
import { createSlug } from "../utils";
import { getFlairLookup } from "@/src/stores/create-post";
import { isNotNil } from "../../utils";
import { parseOgData } from "../../html-parsing";
import { shrinkBlockedCommunity, shrinkBlockedPerson } from "./utils";

const POST_SORTS = [
  "Active",
  "Hot",
  "New",
  "Old",
  "TopAll",
  "TopHour",
  "TopSixHour",
  "TopTwelveHour",
  "TopDay",
  "TopWeek",
  "TopMonth",
  "TopThreeMonths",
  "TopSixMonths",
  "TopNineMonths",
  "TopYear",
  "Scaled",
] as const;
const postSortSchema = z.custom<(typeof POST_SORTS)[number]>((sort) => {
  return _.isString(sort) && POST_SORTS.includes(sort as any);
});

const COMMENT_SORTS = ["Hot", "Top", "New", "Old"] as const;

const commentSortSchema = z.custom<(typeof COMMENT_SORTS)[number]>((sort) => {
  return _.isString(sort) && COMMENT_SORTS.includes(sort as any);
});

const COMMUNITY_SORTS = ["Hot", "TopAll", "New"] as const;
const communitySortSchema = z.custom<(typeof COMMUNITY_SORTS)[number]>(
  (sort) => {
    return _.isString(sort) && COMMUNITY_SORTS.includes(sort as any);
  },
);

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

export function getIdFromLocalApId(apId: string) {
  try {
    const pathname = new URL(apId).pathname;
    const id = pathname.match(/^\/(post|comment)\/([0-9]+)$/)?.[2];
    const RESOLVED = {
      post_Id: undefined,
      comment_id: undefined,
      community_id: undefined,
      person_id: undefined,
      feed_id: undefined,
    };
    if (id && pathname.startsWith("/post/")) {
      return {
        ...RESOLVED,
        post_id: _.parseInt(id),
      };
    }
  } catch {}
  return null;
}

const pieFedFlairSchema = z.object({
  background_color: z.string().optional().nullable(),
  // blur_images: false,
  // community_id: 599,
  flair_title: z.string(),
  id: z.number(),
  text_color: z.string().optional().nullable(),
});

const nextPageSchema = z.union([z.string(), z.number()]).nullish();

export const pieFedCommunitySchema = z.object({
  actor_id: z.string(),
  //ap_domain: z.string(),
  //banned: z.boolean(),
  //deleted: z.boolean(),
  //hidden: z.boolean(),
  icon: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  id: z.number(),
  //instance_id: z.number(),
  //local: z.boolean(),
  name: z.string(),
  nsfw: z.boolean(),
  published: z.string(),
  //removed: z.boolean(),
  //restricted_to_mods: z.boolean(),
  //title: z.string(),
  description: z.string().nullable().optional(),
  //updated: z.string().optional(),
});

export const pieFedFeedSchema = z.object({
  published: z.string(),
  actor_id: z.string(),
  banner: z.string().nullish(),
  communities_count: z.number(),
  subscriptions_count: z.number(),
  description: z.string(),
  description_html: z.string(),
  icon: z.string().nullish(),
  id: z.number(),
  name: z.string(),
  nsfw: z.boolean(),
  communities: z.array(pieFedCommunitySchema),
});

export const pieFedPostCountsSchema = z.object({
  comments: z.number(),
  downvotes: z.number(),
  //newest_comment_time: z.string(),
  //post_id: z.number(),
  //published: z.string(),
  //score: z.number(),
  upvotes: z.number(),
});

export const pieFedPersonSchema = z.object({
  about: z.string().nullable().optional(),
  actor_id: z.string(),
  avatar: z.string().nullable().optional(),
  //banner: z.string().nullable().optional(),
  banned: z.boolean().nullish(),
  bot: z.boolean(),
  deleted: z.boolean(),
  id: z.number(),
  //instance_id: z.number(),
  //local: z.boolean(),
  published: z.string(),
  //title: z.string().nullable(),
  user_name: z.string(),
});

const pieFedPersonViewSchema = z.object({
  person: pieFedPersonSchema,
  counts: z.object({
    //person_id: z.number(),
    comment_count: z.number(),
    post_count: z.number(),
  }),
});

export const piefedPostPoll = z.object({
  choices: z.array(
    z.object({
      choice_text: z.string(),
      id: z.number(),
      num_votes: z.number(),
      sort_order: z.number(),
    }),
  ),
  end_poll: z.string(),
  local_only: z.boolean(),
  mode: z.enum(["single", "multiple"]),
  my_votes: z.array(z.number()).nullish(),
});

const pieFedEmojiReactionSchema = z.object({
  token: z.string(),
  count: z.number(),
  authors: z.array(z.string()),
  url: z.string().nullish(),
});

export const pieFedPostSchema = z.object({
  alt_text: z.string().nullable().optional(),
  ap_id: z.string(),
  body: z.string().nullable().optional(),
  //community_id: z.number(),
  deleted: z.boolean(),
  //edited_at: z.string().optional(),
  id: z.number(),
  //language_id: z.number(),
  //local: z.boolean(),
  //locked: z.boolean(),
  nsfw: z.boolean().nullable().optional(),
  published: z.string(),
  removed: z.boolean(),
  //small_thumbnail_url: z.string().optional(),
  sticky: z.boolean().nullish(),
  instance_sticky: z.boolean().nullish(),
  thumbnail_url: z.string().nullable().optional(),
  title: z.string(),
  url: z.string().nullable().optional(),
  //user_id: z.number(),
  locked: z.boolean().nullish(),
  poll: piefedPostPoll.nullish(),
  emoji_reactions: z.array(pieFedEmojiReactionSchema).nullish(),
});

export const pieFedPostViewSchema = z.object({
  //activity_alert: z.boolean(),
  // banned_from_community: z.boolean().nullish(),
  community: pieFedCommunitySchema,
  counts: pieFedPostCountsSchema,
  creator: pieFedPersonSchema,
  creator_banned_from_community: z.boolean().nullish(),
  //creator_is_admin: z.boolean(),
  //creator_is_moderator: z.boolean(),
  //hidden: z.boolean(),
  my_vote: z.number(),
  post: pieFedPostSchema,
  read: z.boolean(),
  saved: z.boolean(),
  //subscribed: z.string(),
  //unread_comments: z.number(),
  flair_list: z.array(pieFedFlairSchema).optional().nullable(),
});

export const pieFedCommunityCountsSchema = z.object({
  //id: z.number(),
  //published: z.string(),
  post_count: z.number().nullable().optional(),
  post_reply_count: z.number().nullable().optional(),
  subscriptions_count: z.number().nullable().optional(),
  total_subscriptions_count: z.number().nullable().optional(),
  active_6monthly: z.number().nullable().optional(),
  active_daily: z.number().nullable().optional(),
  active_monthly: z.number().nullable().optional(),
  active_weekly: z.number().nullable().optional(),
});

export const pieFedCommunityViewSchema = z.object({
  //activity_alert: z.boolean(),
  //blocked: z.boolean(),
  community: pieFedCommunitySchema,
  counts: pieFedCommunityCountsSchema,
  subscribed: z.enum(["Subscribed", "NotSubscribed", "Pending"]),
  flair_list: z.array(pieFedFlairSchema).optional().nullable(),
});

//export const pieFedAdminCountsSchema = z.object({
//  comment_count: z.number(),
//  person_id: z.number(),
//  post_count: z.number(),
//});

export const pieFedAdminSchema = z.object({
  //activity_alert: z.boolean(),
  //counts: pieFedAdminCountsSchema,
  //is_admin: z.boolean(),
  person: pieFedPersonSchema,
});

//export const pieFedLanguageSchema = z.object({
//  code: z.string(),
//  id: z.number(),
//  name: z.string(),
//});

export const pieFedSiteDetailsSchema = z.object({
  //actor_id: z.string(),
  //all_languages: z.array(pieFedLanguageSchema),
  description: z.string().nullable().optional(),
  enable_downvotes: z.boolean(),
  icon: z.string().nullable().optional(),
  name: z.string(),
  registration_mode: z.enum(["Closed", "RequireApplication", "Open"]),
  sidebar: z.string().nullable().optional(),
  user_count: z.number(),
});

export const pieFedLocalUserSchema = z.object({
  //default_listing_type: z.string(),
  //default_sort_type: z.string(),
  //show_bot_accounts: z.boolean(),
  show_nsfw: z.boolean(),
  nsfw_visibility: z.string().nullish(),
  //show_read_posts: z.boolean(),
  //show_scores: z.boolean(),
});

export const pieFedLocalUserViewSchema = z.object({
  //counts: z.object({
  //  comment_count: z.number(),
  //  person_id: z.number(),
  //  post_count: z.number(),
  //}),
  local_user: pieFedLocalUserSchema,
  person: pieFedPersonSchema,
});

export const pieFedMyUserSchema = z.object({
  community_blocks: z
    .array(z.object({ community: pieFedCommunitySchema }))
    .optional()
    .nullable(),
  //discussion_languages: z.array(pieFedLanguageSchema).optional(),
  follows: z
    .array(z.object({ community: pieFedCommunitySchema }))
    .optional()
    .nullable(),
  //instance_blocks: z.array(z.any()).optional(),
  local_user_view: pieFedLocalUserViewSchema.optional().nullable(),
  moderates: z
    .array(z.object({ community: pieFedCommunitySchema }))
    .optional()
    .nullable(),
  person_blocks: z
    .array(z.object({ target: pieFedPersonSchema }))
    .optional()
    .nullable(),
});

export const pieFedSiteSchema = z.object({
  admins: z.array(pieFedAdminSchema),
  my_user: pieFedMyUserSchema.optional().nullable(),
  site: pieFedSiteDetailsSchema,
  version: z.string(),
});

export const pieFedCommentSchema = z.object({
  ap_id: z.string(),
  body: z.string(),
  deleted: z.boolean(),
  //distinguished: z.boolean(),
  answer: z.boolean().nullish(),
  //edited_at: z.string().optional(),
  id: z.number(),
  //language_id: z.number(),
  //local: z.boolean(),
  path: z.string(),
  //post_id: z.number(),
  published: z.string(),
  removed: z.boolean(),
  //user_id: z.number(),
  locked: z.boolean().nullish(),
  emoji_reactions: z.array(pieFedEmojiReactionSchema).nullish(),
});

export const pieFedCommentCountsSchema = z.object({
  child_count: z.number(),
  //comment_id: z.number(),
  downvotes: z.number(),
  //published: z.string(),
  //score: z.number(),
  upvotes: z.number(),
});

function extractEmojiReactionData(
  emojiReactions:
    | z.infer<typeof pieFedEmojiReactionSchema>[]
    | undefined
    | null,
) {
  const reactions = emojiReactions ?? [];
  return {
    emojiReactions: reactions.map(({ token, count, url }) => ({
      token,
      count,
      ...(url ? { url } : {}),
    })),
  };
}

type PieFedCommentChildView = {
  comment: z.infer<typeof pieFedCommentSchema>;
  counts: z.infer<typeof pieFedCommentCountsSchema>;
  creator: z.infer<typeof pieFedPersonSchema>;
  my_vote: number;
  replies: PieFedCommentChildView[];
  emoji_reactions?: z.infer<typeof pieFedEmojiReactionSchema>[] | null;
};

const pieFedCommentChildSchema: z.ZodType<PieFedCommentChildView> = z.lazy(() =>
  z.object({
    comment: pieFedCommentSchema,
    counts: pieFedCommentCountsSchema,
    creator: pieFedPersonSchema,
    my_vote: z.number(),
    replies: z.array(pieFedCommentChildSchema),
    creator_banned_from_community: z.boolean().nullish(),
    saved: z.boolean().nullable().optional(),
    emoji_reactions: z.array(pieFedEmojiReactionSchema).nullish(),
  }),
);

const pieFedCommentViewSchema = z.object({
  //activity_alert: z.boolean(),
  // banned_from_community: z.boolean().nullish(),
  //can_auth_user_moderate: z.boolean().optional(),
  comment: pieFedCommentSchema,
  community: pieFedCommunitySchema,
  counts: pieFedCommentCountsSchema,
  creator: pieFedPersonSchema,
  creator_banned_from_community: z.boolean().nullish(),
  //creator_blocked: z.boolean(),
  //creator_is_admin: z.boolean(),
  //creator_is_moderator: z.boolean(),
  my_vote: z.number(),
  post: pieFedPostSchema,
  saved: z.boolean().nullable().optional(),
  //subscribed: z.enum(["Subscribed", "NotSubscribed", "Pending"]),
  replies: z.array(pieFedCommentChildSchema).nullable().optional(),
});

export const pieFedCommentReplySchema = z.object({
  id: z.number(),
  //recipient_id: z.number(),
  //comment_id: z.number(),
  read: z.boolean(),
  published: z.string(),
});

export const pieFedReplyViewSchema = z.object({
  comment_reply: pieFedCommentReplySchema,
  comment: pieFedCommentSchema,
  creator: pieFedPersonSchema,
  post: pieFedPostSchema,
  community: pieFedCommunitySchema,
  //recipient: pieFedPersonSchema,
  counts: pieFedCommentCountsSchema,
  //creator_banned_from_community: z.boolean(),
  //creator_is_moderator: z.boolean(),
  //creator_is_admin: z.boolean(),
  //subscribed: z.enum(["Subscribed", "NotSubscribed", "Pending"]),
  //saved: z.boolean(),
  //creator_blocked: z.boolean(),
  my_vote: z.number(),
});

export const pieFedPrivateMessageSchema = z.object({
  id: z.number(),
  //creator_id: z.number(),
  //recipient_id: z.number(),
  content: z.string(),
  //deleted: z.boolean(),
  read: z.boolean(),
  published: z.string(),
  //updated: z.string().optional(),
  //ap_id: z.string(),
  //local: z.boolean(),
});

export const pieFedPrivateMessageViewSchema = z.object({
  private_message: pieFedPrivateMessageSchema,
  creator: pieFedPersonSchema,
  recipient: pieFedPersonSchema,
});

export const pieFedCrosspostSchema = z.object({
  //activity_alert: z.boolean(),
  //banned_from_community: z.boolean(),
  community: pieFedCommunitySchema.pick({
    actor_id: true,
    name: true,
  }),
  //counts: pieFedPostCountsSchema,
  //creator: pieFedPersonSchema,
  //creator_banned_from_community: z.boolean(),
  //creator_is_admin: z.boolean(),
  //creator_is_moderator: z.boolean(),
  //hidden: z.boolean(),
  //my_vote: z.number(),
  post: pieFedPostSchema.pick({
    ap_id: true,
  }),
  //read: z.boolean(),
  //saved: z.boolean(),
  //subscribed: z.enum(["Subscribed", "NotSubscribed", "Pending"]),
  //unread_comments: z.number(),
});

function convertPoll(
  poll: z.infer<typeof piefedPostPoll>,
): Schemas.Post["poll"] {
  return {
    choices: poll.choices.map((choise) => ({
      text: choise.choice_text,
      id: choise.id,
      numVotes: choise.num_votes,
    })),
    endDate: poll.end_poll,
    localOnly: poll.local_only,
    mode: poll.mode,
    myVotes: poll.my_votes ?? undefined,
  };
}

function convertFlair(flair: z.infer<typeof pieFedFlairSchema>): Schemas.Flair {
  return {
    id: flair.id,
    title: flair.flair_title,
    color: flair.text_color ?? null,
    backgroundColor: flair.background_color ?? null,
  };
}

function convertPost({
  postView,
  crossPosts,
}: {
  postView: z.infer<typeof pieFedPostViewSchema>;
  crossPosts?: z.infer<typeof pieFedCrosspostSchema>[];
}): Schemas.Post {
  const { post, counts, community, creator } = postView;
  return {
    locked: post.locked ?? false,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.user_name })
      .slug,
    url: post.url ?? null,
    // TODO: see if this exists
    urlContentType: null,
    creatorId: creator.id,
    createdAt: post.published,
    isBannedFromCommunity: postView.creator_banned_from_community ?? false,
    id: post.id,
    apId: post.ap_id,
    title: post.title,
    body: post.body ?? null,
    thumbnailUrl: post.thumbnail_url ?? null,
    // TODO: add this
    embedVideoUrl: null,
    upvotes: counts.upvotes,
    downvotes: counts.downvotes,
    myVote: postView.my_vote,
    commentsCount: counts.comments,
    deleted: post.deleted,
    removed: post.removed,
    thumbnailAspectRatio: null,
    communitySlug: createSlug({
      apId: community.actor_id,
      name: community.name,
    }).slug,
    communityApId: community.actor_id,
    creatorApId: creator.actor_id,
    crossPosts:
      crossPosts?.map((cp) => ({
        apId: cp.post.ap_id,
        communitySlug: createSlug({
          apId: cp.community.actor_id,
          name: cp.community.name,
        }).slug,
      })) ?? null,
    featuredCommunity: postView.post.sticky ?? false,
    featuredLocal: postView.post.instance_sticky ?? false,
    read: postView.read,
    saved: postView.saved,
    nsfw: post.nsfw || community.nsfw,
    altText: post.alt_text ?? null,
    flairs: postView.flair_list?.map((flair) => ({ id: flair.id })) ?? null,
    poll: postView.post.poll ? convertPoll(postView.post.poll) : undefined,
    ...extractEmojiReactionData(post.emoji_reactions),
  };
}

function convertCommunity(
  communityView:
    | z.infer<typeof pieFedCommunityViewSchema>
    | { community: z.infer<typeof pieFedCommunitySchema> },
  mode: "full" | "partial",
): Schemas.Community {
  const counts = "counts" in communityView ? communityView.counts : null;
  const subscribed =
    "subscribed" in communityView ? communityView.subscribed : null;
  const c: Schemas.Community = {
    createdAt: communityView.community.published,
    id: communityView.community.id,
    apId: communityView.community.actor_id,
    slug: createSlug({
      apId: communityView.community.actor_id,
      name: communityView.community.name,
    }).slug,
    icon: communityView.community.icon ?? null,
    ...(counts
      ? {
          postCount: counts.post_count ?? undefined,
          commentCount: counts.post_reply_count ?? undefined,
          subscriberCount: counts.total_subscriptions_count ?? undefined,
          subscribersLocalCount: counts.subscriptions_count ?? undefined,
          usersActiveHalfYearCount: counts.active_6monthly ?? undefined,
          usersActiveDayCount: counts.active_daily ?? undefined,
          usersActiveMonthCount: counts.active_monthly ?? undefined,
          usersActiveWeekCount: counts.active_weekly ?? undefined,
        }
      : {}),
    ...(subscribed
      ? {
          subscribed,
        }
      : {}),
  };

  if (mode === "full" || communityView.community.description) {
    c.description = communityView.community.description ?? null;
  }
  if (mode === "full" || communityView.community.banner) {
    c.banner = communityView.community.banner ?? null;
  }
  if ("flair_list" in communityView) {
    c.flairs = communityView.flair_list?.map(({ id }) => ({ id }));
  }

  return c;
}

function convertPerson(
  {
    person,
    counts,
  }:
    | z.infer<typeof pieFedPersonViewSchema>
    | {
        person: z.infer<typeof pieFedPersonSchema>;
        counts?: undefined;
      },
  mode: "full" | "partial",
): Schemas.Person {
  const p: Schemas.Person = {
    apId: person.actor_id,
    id: person.id,
    avatar: person.avatar ?? null,
    matrixUserId: null,
    slug: createSlug({ apId: person.actor_id, name: person.user_name }).slug,
    deleted: person.deleted,
    createdAt: person.published,
    isBot: person.bot,
    isBanned: person.banned ?? false,
  };

  // PieFed excludes about from some endpoints.
  // Full means it's giving us the full person object
  // which includes about.
  if (mode === "full" || person.about) {
    p.bio = person.about ?? null;
  }
  if (mode === "full" || counts) {
    p.postCount = counts?.post_count ?? null;
    p.commentCount = counts?.comment_count ?? null;
  }

  return p;
}

function convertComment(
  commentView: z.infer<typeof pieFedCommentViewSchema>,
): Schemas.Comment {
  const { post, counts, creator, comment, community } = commentView;
  return {
    locked: comment.locked ?? false,
    createdAt: comment.published,
    id: comment.id,
    apId: comment.ap_id,
    body: comment.body,
    creatorId: creator.id,
    creatorApId: creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.user_name })
      .slug,
    isBannedFromCommunity: commentView.creator_banned_from_community ?? false,
    path: comment.path,
    downvotes: counts.downvotes,
    upvotes: counts.upvotes,
    postId: post.id,
    postApId: post.ap_id,
    removed: comment.removed,
    deleted: comment.deleted,
    communitySlug: createSlug({
      apId: community.actor_id,
      name: community.name,
    }).slug,
    communityApId: community.actor_id,
    postTitle: post.title,
    myVote: commentView.my_vote ?? null,
    childCount: counts.child_count,
    saved: commentView.saved ?? false,
    answer: comment.answer ?? false,
    ...extractEmojiReactionData(comment.emoji_reactions),
  };
}

function convertReply(
  replyView: z.infer<typeof pieFedReplyViewSchema>,
): Schemas.Reply {
  const { creator, community } = replyView;
  return {
    createdAt: replyView.comment_reply.published,
    id: replyView.comment_reply.id,
    commentId: replyView.comment.id,
    commentApId: replyView.comment.ap_id,
    communityApId: community.actor_id,
    communitySlug: createSlug({
      apId: community.actor_id,
      name: community.name,
    }).slug,
    body: replyView.comment.body,
    path: replyView.comment.path,
    creatorId: replyView.creator.id,
    creatorApId: replyView.creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.user_name })
      .slug,
    read: replyView.comment_reply.read,
    postId: replyView.post.id,
    postApId: replyView.post.ap_id,
    postName: replyView.post.title,
    deleted: replyView.comment.deleted,
    removed: replyView.comment.removed,
  };
}

function convertPrivateMessage(
  pmView: z.infer<typeof pieFedPrivateMessageViewSchema>,
): Schemas.PrivateMessage {
  const { creator, recipient } = pmView;
  return {
    createdAt: pmView.private_message.published,
    id: pmView.private_message.id,
    creatorApId: creator.actor_id,
    creatorId: creator.id,
    creatorSlug: createSlug({
      apId: recipient.actor_id,
      name: recipient.user_name,
    }).slug,
    recipientApId: recipient.actor_id,
    recipientId: recipient.id,
    recipientSlug: createSlug({
      apId: recipient.actor_id,
      name: recipient.user_name,
    }).slug,
    body: pmView.private_message.content,
    read: pmView.private_message.read,
  };
}

function convertMention(
  replyView: z.infer<typeof pieFedReplyViewSchema>,
): Schemas.Reply {
  const { creator, community } = replyView;
  return {
    createdAt: replyView.comment_reply.published,
    id: replyView.comment_reply.id,
    commentId: replyView.comment.id,
    commentApId: replyView.comment.ap_id,
    communityApId: community.actor_id,
    communitySlug: createSlug({
      apId: community.actor_id,
      name: community.name,
    }).slug,
    body: replyView.comment.body,
    path: replyView.comment.path,
    creatorId: replyView.creator.id,
    creatorApId: replyView.creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.user_name })
      .slug,
    read: replyView.comment_reply.read,
    postId: replyView.post.id,
    postApId: replyView.post.ap_id,
    postName: replyView.post.title,
    deleted: replyView.comment.deleted,
    removed: replyView.comment.removed,
  };
}

const errorResponseSchema = z.object({
  error: z.string(),
});

export function flattenCommentViews(
  comments: z.infer<typeof pieFedCommentViewSchema>[],
): z.infer<typeof pieFedCommentViewSchema>[] {
  const result: z.infer<typeof pieFedCommentViewSchema>[] = [];

  function recurse(nodes: z.infer<typeof pieFedCommentViewSchema>[]) {
    for (const node of nodes) {
      const { community, post } = node;
      result.push(node);
      if (node.replies?.length) {
        recurse(
          node.replies.map((reply) => ({
            ...reply,
            community,
            post,
          })),
        );
      }
    }
  }

  recurse(comments);
  return result;
}

function convertModlogPersonPieFed(
  person:
    | { actor_id: string; user_name: string; id: number }
    | null
    | undefined,
) {
  if (!person) {
    return { id: null, apId: null, slug: null };
  }
  return {
    id: person.id,
    apId: person.actor_id,
    slug: createSlug({ apId: person.actor_id, name: person.user_name }).slug,
  };
}

function convertModlogCommunityPieFed(
  community: { actor_id: string; name: string; id: number } | null | undefined,
) {
  if (!community) {
    return { id: null, apId: null, slug: null };
  }
  return {
    id: community.id,
    apId: community.actor_id,
    slug: createSlug({ apId: community.actor_id, name: community.name }).slug,
  };
}

function convertModlogResponsePieFed(json: any): Schemas.ModlogItem[] {
  const items: Schemas.ModlogItem[] = [];

  for (const view of (json.removed_posts ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    items.push({
      id: view.mod_remove_post.id,
      actionType: "removed_post",
      isAdminAction: false,
      createdAt: view.mod_remove_post.when_,
      reason: view.mod_remove_post.reason ?? null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: null,
      userApId: null,
      userSlug: null,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: view.post?.id ?? null,
      postApId: view.post?.ap_id ?? null,
      postTitle: view.post?.title ?? null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.locked_posts ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    items.push({
      id: view.mod_lock_post.id,
      actionType: "locked_post",
      isAdminAction: false,
      createdAt: view.mod_lock_post.when_,
      reason: null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: null,
      userApId: null,
      userSlug: null,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: view.post?.id ?? null,
      postApId: view.post?.ap_id ?? null,
      postTitle: view.post?.title ?? null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.featured_posts ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    items.push({
      id: view.mod_feature_post.id,
      actionType: "featured_post",
      isAdminAction: false,
      createdAt: view.mod_feature_post.when_,
      reason: null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: null,
      userApId: null,
      userSlug: null,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: view.post?.id ?? null,
      postApId: view.post?.ap_id ?? null,
      postTitle: view.post?.title ?? null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.removed_comments ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    const user = convertModlogPersonPieFed(view.commenter);
    items.push({
      id: view.mod_remove_comment.id,
      actionType: "removed_comment",
      isAdminAction: false,
      createdAt: view.mod_remove_comment.when_,
      reason: view.mod_remove_comment.reason ?? null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: user.id,
      userApId: user.apId,
      userSlug: user.slug,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: view.post?.id ?? null,
      postApId: view.post?.ap_id ?? null,
      postTitle: view.post?.title ?? null,
      commentId: view.comment?.id ?? null,
      commentApId: view.comment?.ap_id ?? null,
      commentContent: view.comment?.body ?? null,
    });
  }

  for (const view of (json.removed_communities ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community ?? null);
    items.push({
      id: view.mod_remove_community.id,
      actionType: "removed_community",
      isAdminAction: false,
      createdAt: view.mod_remove_community.when_,
      reason: view.mod_remove_community.reason ?? null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: null,
      userApId: null,
      userSlug: null,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: null,
      postApId: null,
      postTitle: null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.banned_from_community ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    const user = convertModlogPersonPieFed(view.banned_person);
    items.push({
      id: view.mod_ban_from_community.id,
      actionType: "banned_from_community",
      isAdminAction: false,
      createdAt: view.mod_ban_from_community.when_,
      reason: view.mod_ban_from_community.reason ?? null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: user.id,
      userApId: user.apId,
      userSlug: user.slug,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: null,
      postApId: null,
      postTitle: null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.banned ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const user = convertModlogPersonPieFed(view.banned_person);
    items.push({
      id: view.mod_ban.id,
      actionType: "banned",
      isAdminAction: false,
      createdAt: view.mod_ban.when_,
      reason: view.mod_ban.reason ?? null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: user.id,
      userApId: user.apId,
      userSlug: user.slug,
      communityId: null,
      communityApId: null,
      communitySlug: null,
      postId: null,
      postApId: null,
      postTitle: null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.added_to_community ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    const user = convertModlogPersonPieFed(view.modded_person);
    items.push({
      id: view.mod_add_community.id,
      actionType: "added_to_community",
      isAdminAction: false,
      createdAt: view.mod_add_community.when_,
      reason: null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: user.id,
      userApId: user.apId,
      userSlug: user.slug,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: null,
      postApId: null,
      postTitle: null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.transferred_to_community ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const community = convertModlogCommunityPieFed(view.community);
    const user = convertModlogPersonPieFed(view.modded_person);
    items.push({
      id: view.mod_transfer_community.id,
      actionType: "transferred_to_community",
      isAdminAction: false,
      createdAt: view.mod_transfer_community.when_,
      reason: null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: user.id,
      userApId: user.apId,
      userSlug: user.slug,
      communityId: community.id,
      communityApId: community.apId,
      communitySlug: community.slug,
      postId: null,
      postApId: null,
      postTitle: null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  for (const view of (json.added ?? []) as any[]) {
    const mod = convertModlogPersonPieFed(view.moderator);
    const user = convertModlogPersonPieFed(view.modded_person);
    items.push({
      id: view.mod_add.id,
      actionType: "added_admin",
      isAdminAction: true,
      createdAt: view.mod_add.when_,
      reason: null,
      modId: mod.id,
      modApId: mod.apId,
      modSlug: mod.slug,
      userId: user.id,
      userApId: user.apId,
      userSlug: user.slug,
      communityId: null,
      communityApId: null,
      communitySlug: null,
      postId: null,
      postApId: null,
      postTitle: null,
      commentId: null,
      commentApId: null,
      commentContent: null,
    });
  }

  // TODO: implement admin_purged_* conversion once example data is available

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export class PieFedApi implements ApiBlueprint<null> {
  software = Software.PIEFED;
  softwareVersion: string;

  client = null;
  instance: string;
  limit = 25;

  jwt?: string;

  private async parseResponse(res: Response) {
    const json = await res.json();
    if (res.status < 200 || res.status >= 300) {
      if (res.status === 400 || res.status === 404) {
        throw Errors.OBJECT_NOT_FOUND;
      } else {
        const { data } = errorResponseSchema.safeParse(json);
        throw new Error(
          data?.error ?? `unexpected error, status code ${res.status}`,
        );
      }
    } else {
      return json;
    }
  }

  private async get(
    endpoint: string,
    query: Record<string, any>,
    options?: RequestOptions,
  ) {
    query = { ...query };
    for (const key in query) {
      if (_.isNil(query[key])) {
        delete query[key];
      }
    }
    const params = new URLSearchParams(query);

    const res = await fetch(
      `${this.instance}/api/alpha${endpoint}?${params.toString()}`,
      {
        headers: {
          ...DEFAULT_HEADERS,
          ...(this.jwt
            ? {
                authorization: `Bearer ${this.jwt}`,
              }
            : {}),
        },
        cache: "no-store",
        ...options,
      },
    );
    return await this.parseResponse(res);
  }

  private async post(endpoint: string, body: Record<string, any>) {
    body = { ...body };
    for (const key in body) {
      if (_.isUndefined(body[key])) {
        delete body[key];
      }
    }

    const res = await fetch(`${this.instance}/api/alpha${endpoint}`, {
      headers: {
        ...DEFAULT_HEADERS,
        ...(this.jwt
          ? {
              authorization: `Bearer ${this.jwt}`,
            }
          : {}),
      },
      body: JSON.stringify(body),
      method: "POST",
      cache: "no-store",
    });
    return await this.parseResponse(res);
  }

  private async put(endpoint: string, body: Record<string, any>) {
    body = { ...body };
    for (const key in body) {
      if (_.isUndefined(body[key])) {
        delete body[key];
      }
    }

    const res = await fetch(`${this.instance}/api/alpha${endpoint}`, {
      headers: {
        ...DEFAULT_HEADERS,
        ...(this.jwt
          ? {
              authorization: `Bearer ${this.jwt}`,
            }
          : {}),
      },
      body: JSON.stringify(body),
      method: "PUT",
      cache: "no-store",
    });
    return await this.parseResponse(res);
  }

  private resolveObjectId = _.memoize(
    async (apId: string) => {
      // This shortcut only works for local objects
      if (apId.startsWith(this.instance)) {
        const local = getIdFromLocalApId(apId);
        if (local) {
          return local;
        }
      }

      const json = await this.get("/resolve_object", {
        q: apId,
      });

      try {
        const { post, comment, community, person, feed } = z
          .object({
            comment: z
              .object({
                comment: z.object({ id: z.number() }),
              })
              .nullish(),
            post: z.object({ post: z.object({ id: z.number() }) }).nullish(),
            community: z
              .object({
                community: z.object({ id: z.number() }),
              })
              .nullish(),
            person: z
              .object({ person: z.object({ id: z.number() }) })
              .nullish(),
            feed: z
              .object({
                id: z.number(),
              })
              .nullish(),
          })
          .parse(json);

        return {
          post_id: post?.post.id,
          comment_id: comment?.comment.id,
          community_id: community?.community.id,
          person_id: person?.person.id,
          feed_id: feed?.id,
        };
      } catch (err) {
        console.log(err);
        throw err;
      }
    },
    (apId) => apId,
  );

  constructor({
    instance,
    jwt,
    softwareVersion,
  }: {
    instance: string;
    jwt?: string;
    softwareVersion: string;
  }) {
    this.softwareVersion = softwareVersion;
    this.instance = instance.replace(/\/$/, "");
    this.jwt = jwt;
  }

  async getSite(options: RequestOptions) {
    const json = await this.get("/site", {}, options);
    try {
      const pieFedSite = pieFedSiteSchema.parse(json);
      const pieFedMe = pieFedSite.my_user?.local_user_view?.person;

      const moderates = pieFedSite.my_user?.moderates?.map(({ community }) =>
        convertCommunity({ community }, "partial"),
      );

      const follows = pieFedSite.my_user?.follows?.map(({ community }) =>
        convertCommunity({ community }, "partial"),
      );

      const communityBlocks = pieFedSite.my_user?.community_blocks?.map(
        ({ community }) =>
          shrinkBlockedCommunity(convertCommunity({ community }, "partial")),
      );

      const me = pieFedMe
        ? convertPerson({ person: pieFedMe }, "partial")
        : null;

      const personBlocks = pieFedSite.my_user?.person_blocks?.map((block) =>
        shrinkBlockedPerson(convertPerson({ person: block.target }, "partial")),
      );

      const admins = pieFedSite.admins.map((p) => convertPerson(p, "full"));
      const nsfwVisibility =
        pieFedSite.my_user?.local_user_view?.local_user.nsfw_visibility?.toLowerCase();

      const site = {
        privateInstance: false,
        description: pieFedSite.site.description ?? null,
        instance: this.instance,
        admins: admins.map((a) => a.apId),
        me,
        myEmail: null,
        version: pieFedSite.version,
        // TODO: get these counts
        usersActiveDayCount: null,
        usersActiveWeekCount: null,
        usersActiveMonthCount: null,
        usersActiveHalfYearCount: null,
        postCount: null,
        commentCount: null,
        userCount: pieFedSite.site.user_count,
        sidebar: pieFedSite.site.sidebar ?? null,
        icon: pieFedSite.site.icon ?? null,
        title: pieFedSite.site.name,
        moderates: moderates?.map((c) => c.slug) ?? null,
        follows: follows?.map((c) => c.slug) ?? null,
        personBlocks: personBlocks?.map((p) => p.apId) ?? null,
        communityBlocks: communityBlocks?.map((c) => c.slug) ?? null,
        applicationQuestion: null,
        registrationMode: pieFedSite.site.registration_mode,
        showNsfw:
          pieFedSite.my_user?.local_user_view?.local_user.show_nsfw ?? false,
        blurNsfw: nsfwVisibility !== "show",
        enablePostDownvotes: pieFedSite.site.enable_downvotes,
        enableCommentDownvotes: pieFedSite.site.enable_downvotes,
        software: this.software,
      };

      return {
        site,
        profiles: [...admins, ...(personBlocks ?? []), ...(me ? [me] : [])],
        communities: [
          ...(moderates ?? []),
          ...(follows ?? []),
          ...(communityBlocks ?? []),
        ],
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getPosts(form: Forms.GetPosts, options: RequestOptions) {
    const { data: sort } = postSortSchema.safeParse(form.sort);

    let feed_id: number | undefined = form.multiCommunityFeedId;
    if (form.multiCommunityFeedApId && _.isNil(feed_id)) {
      feed_id = (await this.resolveObjectId(form.multiCommunityFeedApId))
        .feed_id;
      if (!feed_id) {
        throw Errors.OBJECT_NOT_FOUND;
      }
    }

    const json = await this.get(
      "/post/list",
      {
        limit: this.limit,
        page: form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        community_name: form.communitySlug,
        sort,
        type_: form.type,
        saved_only: form.savedOnly,
        feed_id,
      },
      options,
    );
    try {
      const { posts, next_page } = z
        .object({
          next_page: nextPageSchema,
          posts: z.array(pieFedPostViewSchema),
        })
        .parse(json);
      const filteredPosts = form.showRead
        ? posts
        : posts.filter((p) => !p.read);
      return {
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
        posts: filteredPosts.map((post) => ({
          post: convertPost({ postView: post }),
          creator: convertPerson({ person: post.creator }, "partial"),
          community: convertCommunity({ community: post.community }, "partial"),
          flairs: post.flair_list?.map(convertFlair),
        })),
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getCommunities(form: Forms.GetCommunities, options: RequestOptions) {
    const { data: sort } = communitySortSchema.safeParse(form.sort);
    const json = await this.get(
      "/community/list",
      {
        limit: this.limit,
        page: form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        sort: sort === "TopAll" ? "Top" : sort,
        type_: form.type,
      },
      options,
    );
    try {
      const { communities, next_page } = z
        .object({
          next_page: nextPageSchema,
          communities: z.array(pieFedCommunityViewSchema),
        })
        .parse(json);

      return {
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
        communities: communities.map((c) => convertCommunity(c, "partial")),
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getMultiCommunityFeeds(
    form: Forms.GetMultiCommunityFeeds,
    options?: RequestOptions,
  ) {
    const json = await this.get("/feed/list", {}, options);
    try {
      const { feeds } = z
        .object({
          feeds: z.array(pieFedFeedSchema),
        })
        .parse(json);

      const communities = feeds.flatMap(({ communities }) =>
        communities.map((community) =>
          convertCommunity(
            {
              community,
            },
            "partial",
          ),
        ),
      );

      return {
        multiCommunityFeeds: feeds.map((feed) => ({
          createdAt: feed.published,
          id: feed.id,
          apId: feed.actor_id,
          slug: createSlug({ apId: feed.actor_id, name: feed.name }).slug,
          name: feed.name,
          icon: feed.icon ?? null,
          banner: feed.banner ?? null,
          nsfw: feed.nsfw,
          communityCount: feed.communities_count,
          subscriberCount: feed.subscriptions_count,
          description: feed.description ?? null,
          communitySlugs: feed.communities.map(
            (community) =>
              createSlug({ apId: community.actor_id, name: community.name })
                .slug,
          ),
        })),
        communities,
        nextCursor: null,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getCommunity(form: Forms.GetCommunity, options?: RequestOptions) {
    if (!form.slug) {
      throw new Error("community slug required");
    }

    const json = await this.get(
      "/community",
      {
        name: form.slug,
      },
      options,
    );

    try {
      const { community_view, moderators } = z
        .object({
          community_view: pieFedCommunityViewSchema,
          moderators: z.array(
            z.object({
              community: pieFedCommunitySchema,
              moderator: pieFedPersonSchema,
            }),
          ),
        })
        .parse(json);

      return {
        community: convertCommunity(community_view, "full"),
        mods: moderators.map((m) =>
          convertPerson({ person: m.moderator }, "partial"),
        ),
        flairs: community_view.flair_list?.map(convertFlair),
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getPerson(form: Forms.GetPerson, options: RequestOptions) {
    if (z.string().url().safeParse(form.apIdOrUsername).success) {
      const { person_id } = await this.resolveObjectId(form.apIdOrUsername);
      if (_.isNil(person_id)) {
        throw new Error("person not found for apId");
      }
      const json = await this.get(
        "/user",
        {
          person_id,
        },
        options,
      );
      try {
        const data = z
          .object({ person_view: pieFedPersonViewSchema })
          .parse(json);
        return convertPerson(data.person_view, "full");
      } catch (err) {
        console.log(err);
        throw err;
      }
    } else {
      const json = await this.get(
        "/user",
        {
          username: form.apIdOrUsername,
        },
        options,
      );
      try {
        const data = z
          .object({ person_view: pieFedPersonViewSchema })
          .parse(json);
        return convertPerson(data.person_view, "full");
      } catch (err) {
        console.log(err);
        throw err;
      }
    }
  }

  async getPost(form: { apId: string }, options: RequestOptions) {
    const { post_id } = await this.resolveObjectId(form.apId);
    if (_.isNil(post_id)) {
      throw Errors.OBJECT_NOT_FOUND;
    }
    const json = await this.get(
      "/post",
      {
        id: post_id,
      },
      options,
    );

    try {
      const { post_view, community_view, cross_posts } = z
        .object({
          post_view: pieFedPostViewSchema,
          cross_posts: z.array(pieFedCrosspostSchema),
          community_view: pieFedCommunityViewSchema,
        })
        .parse(json);

      return {
        post: convertPost({
          postView: post_view,
          crossPosts: cross_posts,
        }),
        community_view: convertCommunity(community_view, "partial"),
        creator: convertPerson({ person: post_view.creator }, "partial"),
        flairs: post_view.flair_list?.map(convertFlair),
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async login(form: Forms.Login): Promise<{ jwt: string }> {
    const json = await this.post("/user/login", {
      username: form.username,
      password: form.password,
    });
    try {
      return z.object({ jwt: z.string() }).parse(json);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async likePost(form: Forms.LikePost) {
    const json = await this.post("/post/like", {
      post_id: form.postId,
      score: form.score,
    });
    try {
      const data = z.object({ post_view: pieFedPostViewSchema }).parse(json);
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async addPostReactionEmoji(form: Forms.AddPostReactionEmoji) {
    await this.post("/post/like", {
      post_id: form.postId,
      emoji: form.emoji,
      score: !form.score ? 1 : form.score,
    });
    const json = await this.get("/post", { id: form.postId });
    const data = z.object({ post_view: pieFedPostViewSchema }).parse(json);
    return convertPost({ postView: data.post_view });
  }

  async votePostPoll(form: Forms.PostPollVote) {
    const json = await this.post("/post/poll_vote", {
      post_id: form.postId,
      choice_id: form.choiceId,
    });
    try {
      const { post_view } = z
        .object({ post_view: pieFedPostViewSchema })
        .parse(json);
      return convertPost({ postView: post_view });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async savePost(form: Forms.SavePost): Promise<Schemas.Post> {
    const json = await this.put("/post/save", {
      post_id: form.postId,
      save: form.save,
    });
    try {
      const data = z.object({ post_view: pieFedPostViewSchema }).parse(json);
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async logout(): Promise<void> {
    // TODO implement
  }

  async getComments(
    form: Forms.GetComments,
    options: RequestOptions,
  ): Promise<{
    comments: Schemas.Comment[];
    creators: Schemas.Person[];
    nextCursor: string | null;
  }> {
    try {
      const { data: sort } = commentSortSchema.safeParse(form.sort);

      let post_id: number | undefined = undefined;

      if (form.postApId) {
        post_id = (await this.resolveObjectId(form.postApId)).post_id;

        if (_.isNil(post_id)) {
          throw new Error("could not find post");
        }
      }

      if (form.savedOnly) {
        const json = await this.get(
          "/comment/list",
          {
            limit: this.limit,
            type_: "All",
            sort,
            page:
              form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
            parent_id: form.parentId,
            post_id,
            max_depth: form.maxDepth,
            saved_only: form.savedOnly,
          },
          options,
        );

        const { comments, next_page } = z
          .object({
            next_page: nextPageSchema,
            comments: z.array(pieFedCommentViewSchema),
          })
          .parse(json);

        return {
          comments: comments.map((c) => convertComment(c)),
          creators: comments.map(({ creator }) =>
            convertPerson({ person: creator }, "partial"),
          ),
          nextCursor: isNotNil(next_page) ? String(next_page) : null,
        };
      } else {
        const json = await this.get(
          "/post/replies",
          {
            limit: 100,
            type_: "All",
            sort,
            page:
              form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
            parent_id: form.parentId,
            post_id,
            max_depth: form.maxDepth,
          },
          options,
        );

        const { comments, next_page } = z
          .object({
            comments: z.array(pieFedCommentViewSchema),
            next_page: nextPageSchema,
          })
          .parse(json);

        const flattenedComments = flattenCommentViews(comments);

        return {
          comments: flattenedComments.map((c) => convertComment(c)),
          creators: flattenedComments.map(({ creator }) =>
            convertPerson({ person: creator }, "partial"),
          ),
          nextCursor: isNotNil(next_page) ? String(next_page) : null,
        };
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async likeComment(form: Forms.LikeComment) {
    await this.post("/comment/like", {
      post_id: form.postId,
      comment_id: form.id,
      score: form.score,
    });

    const json = await this.get("/comment", {
      id: form.id,
    });

    try {
      const data = z
        .object({ comment_view: pieFedCommentViewSchema })
        .parse(json);

      return convertComment(data.comment_view);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async addCommentReactionEmoji(form: Forms.AddCommentReactionEmoji) {
    await this.post("/comment/like", {
      comment_id: form.commentId,
      emoji: form.emoji,
      // PieFed requires a score of -1 or 1 to react
      score: !form.score ? 1 : form.score,
    });
    const json = await this.get("/comment", { id: form.commentId });
    const data = z
      .object({ comment_view: pieFedCommentViewSchema })
      .parse(json);
    return convertComment(data.comment_view);
  }

  async saveComment(form: Forms.SaveComment): Promise<Schemas.Comment> {
    const json = await this.put("/comment/save", {
      comment_id: form.commentId,
      save: form.save,
    });
    try {
      const data = z
        .object({ comment_view: pieFedCommentViewSchema })
        .parse(json);
      return convertComment(data.comment_view);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async followCommunity(
    form: Forms.FollowCommunity,
  ): Promise<Schemas.Community> {
    const json = await this.post("/community/follow", {
      community_id: form.communityId,
      follow: form.follow,
    });
    try {
      const data = z
        .object({
          community_view: pieFedCommunityViewSchema,
        })
        .parse(json);
      return convertCommunity(data.community_view, "partial");
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async search(form: Forms.Search, options: RequestOptions) {
    const topSort = form.type === "Communities" || form.type === "Users";
    const json = await this.get(
      "/search",
      {
        q: form.q,
        community_name: form.communitySlug,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
            ? 1
            : _.parseInt(form.pageCursor) + 1,
        type_: form.type === "All" ? "Posts" : form.type,
        limit: form.limit ?? this.limit,
        sort: topSort ? "TopAll" : "Active",
      },
      options,
    );

    try {
      const { posts, communities, users, comments } = z
        .object({
          posts: z.array(pieFedPostViewSchema),
          communities: z.array(pieFedCommunityViewSchema),
          comments: z
            .array(pieFedCommentViewSchema.omit({ replies: true }))
            .optional(),
          users: z.array(pieFedPersonViewSchema),
        })
        .parse(json);

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;

      const hasMorePosts = posts.length >= this.limit;
      const hasMoreCommunities = communities.length >= this.limit;
      const hasMoreUsers = users.length >= this.limit;

      const hasNextCursor = hasMorePosts || hasMoreCommunities || hasMoreUsers;

      return {
        posts: posts.map((p) => convertPost({ postView: p })),
        communities: _.uniqBy(
          [
            ...communities.map((c) => convertCommunity(c, "partial")),
            ...posts.map((p) =>
              convertCommunity({ community: p.community }, "partial"),
            ),
            ...(comments?.map((c) =>
              convertCommunity({ community: c.community }, "partial"),
            ) ?? []),
          ],
          (c) => c.apId,
        ),
        comments: comments?.map((c) => convertComment(c as any)) ?? [],
        users: _.uniqBy(
          [
            ...users.map((p) => convertPerson(p, "partial")),
            ...posts.map((p) =>
              convertPerson({ person: p.creator }, "partial"),
            ),
            ...(comments?.map((c) =>
              convertPerson({ person: c.creator }, "partial"),
            ) ?? []),
          ],
          (p) => p.apId,
        ),
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async deletePost(form: Forms.DeletePost): Promise<Schemas.Post> {
    const json = await this.post("/post/delete", {
      post_id: form.postId,
      deleted: form.deleted,
    });

    try {
      const data = z
        .object({
          post_view: pieFedPostViewSchema,
        })
        .parse(json);

      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async createComment(form: Forms.CreateComment): Promise<Schemas.Comment> {
    const { post_id } = await this.resolveObjectId(form.postApId);

    const json = await this.post("/comment", {
      body: form.body,
      post_id,
      parent_id: form.parentId,
    });

    try {
      const { comment_view } = z
        .object({
          comment_view: pieFedCommentViewSchema,
        })
        .parse(json);

      return convertComment(comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async deleteComment(form: Forms.DeleteComment): Promise<Schemas.Comment> {
    const json = await this.post("/comment/delete", {
      comment_id: form.id,
      deleted: form.deleted,
    });

    try {
      const { comment_view } = z
        .object({
          comment_view: pieFedCommentViewSchema,
        })
        .parse(json);

      return convertComment(comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async editComment(form: Forms.EditComment): Promise<Schemas.Comment> {
    const json = await this.put("/comment", {
      comment_id: form.id,
      body: form.body,
    });

    try {
      const { comment_view } = z
        .object({
          comment_view: pieFedCommentViewSchema,
        })
        .parse(json);

      return convertComment(comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getPersonContent(
    form: Forms.GetPersonContent,
    options: RequestOptions,
  ) {
    const personOrUsername: Partial<{
      username: string;
      person_id: number;
    }> = {};

    if (z.string().url().safeParse(form.apIdOrUsername).success) {
      const { person_id } = await this.resolveObjectId(form.apIdOrUsername);
      if (_.isNil(person_id)) {
        throw new Error("person not found");
      }
      personOrUsername.person_id = person_id;
    } else {
      personOrUsername.username = form.apIdOrUsername;
    }

    const json =
      form.type === "Posts"
        ? await this.get(
            "/post/list",
            {
              ...personOrUsername,
              limit: this.limit,
              sort: "New",
              page:
                form.pageCursor === INIT_PAGE_TOKEN
                  ? undefined
                  : form.pageCursor,
              type_: "All",
            },
            options,
          )
        : await this.get(
            "/comment/list",
            {
              ...personOrUsername,
              limit: this.limit,
              sort: "New",
              page:
                form.pageCursor === INIT_PAGE_TOKEN
                  ? undefined
                  : form.pageCursor,
              type_: "All",
            },
            options,
          );

    try {
      const { posts, comments, next_page } = z
        .object({
          posts: z.array(pieFedPostViewSchema).nullable().optional(),
          comments: z.array(pieFedCommentViewSchema).nullable().optional(),
          next_page: nextPageSchema,
        })
        .parse(json);

      return {
        posts: posts?.map((p) => convertPost({ postView: p })) ?? [],
        comments: comments?.map((c) => convertComment(c)) ?? [],
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async editPost(form: Forms.EditPost) {
    const { post_id } = await this.resolveObjectId(form.apId);
    const res = await this.put("/post", {
      post_id,
      title: form.title,
      url: form.url,
      body: form.body,
      nsfw: form.nsfw ?? false,
    });
    try {
      const data = z.object({ post_view: pieFedPostViewSchema }).parse(res);
      if (form.flairs) {
        const { flairs } = await this.getCommunity({
          slug: convertPost({ postView: data.post_view }).communitySlug,
        });
        const flairLookup = getFlairLookup(flairs);
        const selectedFlairs = form.flairs?.map(flairLookup).filter(isNotNil);
        await this.post("/post/assign_flair", {
          post_id: data.post_view.post.id,
          flair_id_list: selectedFlairs?.map((f) => f.id),
        });
        return {
          ...convertPost({ postView: data.post_view }),
          flairs: selectedFlairs?.map((f) => _.pick(f, ["id"])) ?? null,
        };
      }
      return {
        ...convertPost({ postView: data.post_view }),
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async createPost(form: Forms.CreatePost) {
    const { community, flairs } = await this.getCommunity({
      slug: form.communitySlug,
    });
    const res = await this.post("/post", {
      title: form.title,
      community_id: community.id,
      url: form.url ?? undefined,
      body: form.body ?? undefined,
      nsfw: form.nsfw ?? false,
    });
    try {
      const data = z.object({ post_view: pieFedPostViewSchema }).parse(res);
      const flairLookup = getFlairLookup(flairs);
      const selectedFlairs = form.flairs?.map(flairLookup).filter(isNotNil);
      if (selectedFlairs) {
        await this.post("/post/assign_flair", {
          post_id: data.post_view.post.id,
          flair_id_list: selectedFlairs?.map((f) => f.id),
        });
      }
      return {
        ...convertPost({ postView: data.post_view }),
        flairs: selectedFlairs?.map((f) => _.pick(f, ["id"])) ?? null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async markPostRead(form: Forms.MarkPostRead) {
    await this.post("/post/mark_as_read", {
      post_ids: [form.postIds],
      read: form.read,
    });
  }

  async getPrivateMessages(
    form: Forms.GetPrivateMessages,
    options: RequestOptions,
  ) {
    const json = await this.get(
      "/private_message/list",
      {
        unread_only: form.unreadOnly ?? false,
        page: form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        limit: this.limit,
      },
      options,
    );

    try {
      const { private_messages, next_page } = z
        .object({
          private_messages: z.array(pieFedPrivateMessageViewSchema),
          next_page: nextPageSchema,
        })
        .parse(json);

      const profiles = _.uniqBy(
        [
          ...private_messages.map((pm) => pm.creator),
          ...private_messages.map((pm) => pm.recipient),
        ],
        (p) => p.actor_id,
      ).map((person) => convertPerson({ person }, "partial"));

      return {
        privateMessages: private_messages.map(convertPrivateMessage),
        profiles,
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async createPrivateMessage(form: Forms.CreatePrivateMessage) {
    const json = await this.post("/private_message", {
      content: form.body,
      recipient_id: form.recipientId,
    });

    try {
      const { private_message_view } = z
        .object({
          private_message_view: pieFedPrivateMessageViewSchema,
        })
        .parse(json);

      return convertPrivateMessage(private_message_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async markPrivateMessageRead(form: Forms.MarkPrivateMessageRead) {
    await this.post("/private_message/mark_as_read", {
      private_message_id: form.id,
      read: form.read,
    });
  }

  async featurePost(form: Forms.FeaturePost) {
    const res = await this.post("/post/feature", {
      post_id: form.postId,
      featured: form.featured,
      feature_type: form.featureType,
    });
    try {
      const data = z.object({ post_view: pieFedPostViewSchema }).parse(res);
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getReplies(form: Forms.GetReplies, option: RequestOptions) {
    const json = await this.get(
      "/user/replies",
      {
        sort: form.sort,
        page: form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        limit: this.limit,
        unread_only: form.unreadOnly,
      },
      option,
    );

    try {
      const { replies, next_page } = z
        .object({
          replies: z.array(pieFedReplyViewSchema),
          next_page: nextPageSchema,
        })
        .parse(json);

      return {
        replies: replies.map(convertReply),
        comments: replies.map((c) => convertComment(c as any)),
        profiles: replies.map((r) =>
          convertPerson({ person: r.creator }, "partial"),
        ),
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getMentions(form: Forms.GetMentions, options: RequestOptions) {
    const json = await this.get(
      "/user/mentions",
      {
        page: form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        limit: this.limit,
        unread_only: form.unreadOnly,
      },
      options,
    );

    try {
      const { replies, next_page } = z
        .object({
          next_page: nextPageSchema,
          replies: z.array(pieFedReplyViewSchema),
        })
        .parse(json);

      return {
        mentions: replies.map(convertMention),
        comments: replies.map((c) => convertComment(c as any)),
        profiles: _.unionBy(
          replies.map((r) => convertPerson({ person: r.creator }, "partial")),
          (p) => p.apId,
        ),
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async markAllRead() {
    await this.post("/user/mark_all_as_read", {});
  }

  async markReplyRead(form: Forms.MarkReplyRead) {
    await this.post("/comment/mark_as_read", {
      comment_reply_id: form.id,
      read: form.read,
    });
  }

  async markMentionRead(form: Forms.MarkMentionRead) {
    await this.markReplyRead(form);
  }

  async createPostReport(form: Forms.CreatePostReport) {
    await this.post("/post/report", {
      post_id: form.postId,
      reason: form.reason,
    });
  }

  async removePost(form: Forms.RemovePost) {
    const json = await this.post("/post/remove", {
      post_id: form.postId,
      removed: form.removed,
      reason: form.reason,
    });
    const { post_view, cross_posts } = z
      .object({
        post_view: pieFedPostViewSchema,
        cross_posts: z.array(pieFedCrosspostSchema).nullish(),
      })
      .parse(json);
    return convertPost({
      postView: post_view,
      crossPosts: cross_posts ?? undefined,
    });
  }

  async lockPost(form: Forms.LockPost) {
    const json = await this.post("/post/lock", {
      post_id: form.postId,
      locked: form.locked,
    });
    const { post_view } = z
      .object({
        post_view: pieFedPostViewSchema,
      })
      .parse(json);
    return convertPost({
      postView: post_view,
    });
  }

  async createCommentReport(form: Forms.CreateCommentReport) {
    await this.post("/comment/report", {
      comment_id: form.commentId,
      reason: form.reason,
    });
  }

  async removeComment(form: Forms.RemoveComment) {
    const json = await this.post("/comment/remove", {
      comment_id: form.commentId,
      removed: form.removed,
      reason: form.reason,
    });
    const { comment_view } = z
      .object({
        comment_view: pieFedCommentViewSchema,
      })
      .parse(json);
    return convertComment(comment_view);
  }

  async lockComment(form: Forms.LockComment) {
    const json = await this.post("/comment/lock", {
      comment_id: form.commentId,
      locked: form.locked,
    });
    const { comment_view } = z
      .object({
        comment_view: pieFedCommentViewSchema,
      })
      .parse(json);
    return convertComment(comment_view);
  }

  async markCommentAsAnswer(form: Forms.MarkCommentAsAnswer) {
    const json = await this.post("/comment/mark_as_answer", {
      comment_reply_id: form.commentId,
      answer: form.answer,
    });
    const { comment_reply_view } = z
      .object({ comment_reply_view: pieFedReplyViewSchema })
      .parse(json);
    return convertComment({
      ...comment_reply_view,
      saved: null,
      creator_banned_from_community: null,
    });
  }

  async blockPerson(form: Forms.BlockPerson) {
    await this.post("/user/block", {
      person_id: form.personId,
      block: form.block,
    });
  }

  async blockCommunity(form: Forms.BlockCommunity) {
    await this.post("/community/block", {
      community_id: form.communityId,
      block: form.block,
    });
  }

  async uploadImage(form: Forms.UploadImage) {
    const formData = new FormData();
    formData.append("file", form.image);

    const res = await fetch(`${this.instance}/api/alpha/upload/image`, {
      method: "POST",
      headers: {
        ..._.omit(DEFAULT_HEADERS, "Content-Type"),
        ...(this.jwt ? { authorization: `Bearer ${this.jwt}` } : {}),
      },
      body: formData,
      cache: "no-store",
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`upload failed, status code ${res.status}`);
    }

    const json = await res.json();

    try {
      const { url } = z
        .object({
          url: z.string(),
        })
        .parse(json);

      return {
        url,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async saveUserSettings(form: Forms.SaveUserSettings) {
    let avatar: undefined | string;
    try {
      if (form.avatar) {
        const formData = new FormData();
        formData.append("file", form.avatar);
        const res = await fetch(
          `${this.instance}/api/alpha/upload/user_image`,
          {
            method: "POST",
            headers: {
              ..._.omit(DEFAULT_HEADERS, "Content-Type"),
              ...(this.jwt ? { authorization: `Bearer ${this.jwt}` } : {}),
            },
            body: formData,
            cache: "no-store",
          },
        );
        const json = await res.json();
        avatar = z.object({ url: z.string() }).parse(json).url;
      }
    } catch (e) {
      console.log(e);
    }
    await this.put("/user/save_user_settings", {
      avatar: avatar,
      // banner: form.banner,
      bio: form.bio,
      display_name: form.displayName,
      email: form.email,
    });
  }

  async removeUserAvatar() {
    await this.put("/user/save_user_settings", {
      avatar: null,
    });
  }

  async getCaptcha() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async register() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async getPostReports(form: Forms.GetPostReports, options: RequestOptions) {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async getCommentReports(
    form: Forms.GetCommentReports,
    options: RequestOptions,
  ) {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async resolvePostReport(form: Forms.ResolvePostReport) {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async resolveCommentReport(form: Forms.ResolveCommentReport) {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async resolveObject(form: Forms.ResolveObject, options: RequestOptions) {
    try {
      const json = await this.get(
        "/resolve_object",
        {
          q: form.q,
        },
        options,
      );

      const { post, community, person, comment } = z
        .object({
          post: pieFedPostViewSchema.nullish(),
          community: pieFedCommentViewSchema.nullish(),
          person: pieFedPersonViewSchema.nullish(),
          comment: pieFedCommentViewSchema.nullish(),
        })
        .parse(json);

      return resolveObjectResponseSchema.parse({
        post: post ? convertPost({ postView: post }) : null,
        community: community ? convertCommunity(community, "partial") : null,
        user: person ? convertPerson(person, "partial") : null,
        comment: comment ? convertComment(comment) : null,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getLinkMetadata(form: Forms.GetLinkMetadata) {
    try {
      const json = await this.get("/post/site_metadata", {
        url: form.url,
      });
      const { metadata } = z
        .object({
          metadata: z.object({
            title: z.string().nullish(),
            description: z.string().nullish(),
            content_type: z.string().nullish(),
            image: z.string().nullish(),
            embed_video_url: z.string().nullish(),
          }),
        })
        .parse(json);
      return {
        title: metadata.title,
        description: metadata.title,
        contentType: metadata.content_type,
        imageUrl: metadata.image,
        embedVideoUrl: metadata.embed_video_url,
      };
    } catch {
      try {
        const res = await fetch(form.url);
        const text = await res.text();
        const og = parseOgData(text);
        return {
          imageUrl: og.imageUrl,
          title: og.title,
        };
      } catch {
        return {};
      }
    }
  }

  async getModlog(form: Forms.GetModlog, options: RequestOptions) {
    let community_id: number | undefined;
    if (form.communitySlug) {
      const { community } = await this.getCommunity(
        { slug: form.communitySlug },
        options,
      );
      community_id = community.id;
    }
    const page =
      !form.pageCursor || form.pageCursor === INIT_PAGE_TOKEN
        ? 1
        : _.parseInt(form.pageCursor) + 1;

    const json = await this.get(
      "/modlog",
      { ...(community_id ? { community_id } : {}), page, limit: this.limit },
      options,
    );

    const items = convertModlogResponsePieFed(json);
    const hasNextPage = Object.values(json).some(
      (arr) => Array.isArray(arr) && arr.length >= this.limit,
    );
    return { items, nextCursor: hasNextPage ? String(page) : null };
  }

  getPostSorts() {
    return POST_SORTS;
  }

  getCommentSorts() {
    return COMMENT_SORTS;
  }

  getCommunitySorts() {
    return COMMUNITY_SORTS;
  }
}
