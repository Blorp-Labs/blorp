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
import {
  createHandle,
  getFlairLookup,
  shrinkBlockedCommunity,
  shrinkBlockedPerson,
} from "./utils";
import { isNotNil } from "../lib/utils";
import { parseOgData } from "../lib/html-parsing";
import {
  Comment,
  CommentReplyView,
  CommentView,
  Community,
  CommunityFlair,
  CommunityView,
  createClient,
  FeedView,
  GetApiAlphaCommentListSort,
  GetApiAlphaCommunityListSort,
  GetApiAlphaPostListSort,
  GetModLogResponse,
  Person,
  PersonView,
  Post,
  PostEmojiReactions,
  PostPoll,
  PostReplyView,
  PostView,
  PrivateMessageView,
} from "@blorp-labs/piefed-api-client";

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
] as const satisfies GetApiAlphaPostListSort[];

const postSortSchema = z.custom<(typeof POST_SORTS)[number]>((sort) => {
  return _.isString(sort) && POST_SORTS.includes(sort as any);
});

const COMMENT_SORTS = [
  "Hot",
  "Top",
  "New",
  "Old",
] as const satisfies GetApiAlphaCommentListSort[];

const commentSortSchema = z.custom<(typeof COMMENT_SORTS)[number]>((sort) => {
  return _.isString(sort) && COMMENT_SORTS.includes(sort as any);
});

const COMMUNITY_SORTS = [
  "Hot",
  "TopAll",
  "New",
] as const satisfies GetApiAlphaCommunityListSort[];

const communitySortSchema = z.custom<(typeof COMMUNITY_SORTS)[number]>(
  (sort) => {
    return _.isString(sort) && COMMUNITY_SORTS.includes(sort as any);
  },
);

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

function pageCursorToInt(
  cursor: string | number | undefined,
): number | undefined {
  if (_.isString(cursor)) {
    return _.parseInt(cursor);
  }
  return cursor;
}

function getIdFromLocalApId(apId: string) {
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

function extractEmojiReactionData(
  emojiReactions: PostEmojiReactions | undefined | null,
) {
  const reactions = emojiReactions ?? [];
  return {
    emojiReactions: reactions.map(({ token, count, url }) => ({
      token,
      count: count ?? 0,
      ...(url ? { url } : {}),
    })),
  };
}

function convertPoll(poll: PostPoll): Schemas.Post["poll"] {
  return {
    choices: poll.choices.map((choice) => ({
      text: choice.choice_text,
      id: choice.id,
      numVotes: choice.num_votes ?? 0,
    })),
    endDate: poll.end_poll ?? null,
    localOnly: poll.local_only ?? false,
    mode: poll.mode,
    myVotes: poll.my_votes ?? undefined,
  };
}

function convertFlair(flair: CommunityFlair): Schemas.Flair {
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
  postView: PostView;
  crossPosts?: PostView[];
}): Schemas.Post {
  const { post, counts, community, creator } = postView;
  return {
    locked: post.locked ?? false,
    creatorHandle: createHandle({
      apId: creator.actor_id,
      name: creator.user_name,
    }),
    url: post.url ?? null,
    // TODO: see if this exists
    urlContentType: null,
    creatorId: creator.id,
    communityInstanceId: community.instance_id ?? null,
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
    communityHandle: createHandle({
      apId: community.actor_id,
      name: community.name,
    }),
    communityApId: community.actor_id,
    creatorApId: creator.actor_id,
    crossPosts:
      crossPosts?.map((cp) => ({
        apId: cp.post.ap_id,
        communityHandle: createHandle({
          apId: cp.community.actor_id,
          name: cp.community.name,
        }),
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
  communityView: CommunityView | { community: Community },
  mode: "full" | "partial",
): Schemas.Community {
  const counts = "counts" in communityView ? communityView.counts : null;
  const subscribed =
    "subscribed" in communityView ? communityView.subscribed : null;
  const c: Schemas.Community = {
    createdAt: communityView.community.published,
    id: communityView.community.id,
    apId: communityView.community.actor_id,
    instanceId: communityView.community.instance_id ?? null,
    handle: createHandle({
      apId: communityView.community.actor_id,
      name: communityView.community.name,
    }),
    icon: communityView.community.icon ?? null,
    nsfw: communityView.community.nsfw,
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
    | PersonView
    | {
        person: Person;
        counts?: undefined;
      },
  mode: "full" | "partial",
): Schemas.Person {
  const p: Schemas.Person = {
    apId: person.actor_id,
    id: person.id,
    avatar: person.avatar ?? null,
    matrixUserId: null,
    handle: createHandle({ apId: person.actor_id, name: person.user_name }),
    deleted: person.deleted,
    createdAt: person.published ?? "",
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
  commentView:
    | (PostReplyView & { post: Post; community: Community })
    | CommentView
    | CommentReplyView,
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
    creatorHandle: createHandle({
      apId: creator.actor_id,
      name: creator.user_name,
    }),
    isBannedFromCommunity: commentView.creator_banned_from_community ?? false,
    path: comment.path,
    downvotes: counts.downvotes,
    upvotes: counts.upvotes,
    postId: post.id,
    postApId: post.ap_id,
    removed: comment.removed,
    deleted: comment.deleted,
    communityHandle: createHandle({
      apId: community.actor_id,
      name: community.name,
    }),
    communityApId: community.actor_id,
    postTitle: post.title,
    myVote: commentView.my_vote ?? null,
    childCount: counts.child_count,
    saved: commentView.saved ?? false,
    answer: comment.answer ?? false,
    ...extractEmojiReactionData(comment.emoji_reactions),
  };
}

function convertReply(replyView: CommentReplyView): Schemas.Reply {
  const { creator, community } = replyView;
  return {
    createdAt: replyView.comment_reply.published,
    id: replyView.comment_reply.id,
    commentId: replyView.comment.id,
    commentApId: replyView.comment.ap_id,
    communityApId: community.actor_id,
    communityHandle: createHandle({
      apId: community.actor_id,
      name: community.name,
    }),
    body: replyView.comment.body,
    path: replyView.comment.path,
    creatorId: replyView.creator.id,
    creatorApId: replyView.creator.actor_id,
    creatorHandle: createHandle({
      apId: creator.actor_id,
      name: creator.user_name,
    }),
    read: replyView.comment_reply.read,
    postId: replyView.post.id,
    postApId: replyView.post.ap_id,
    postName: replyView.post.title,
    deleted: replyView.comment.deleted,
    removed: replyView.comment.removed,
  };
}

function convertPrivateMessage(
  pmView: PrivateMessageView,
): Schemas.PrivateMessage {
  const { creator, recipient } = pmView;
  return {
    createdAt: pmView.private_message.published,
    id: pmView.private_message.id,
    creatorApId: creator.actor_id,
    creatorId: creator.id,
    creatorHandle: createHandle({
      apId: creator.actor_id,
      name: creator.user_name,
    }),
    recipientApId: recipient.actor_id,
    recipientId: recipient.id,
    recipientHandle: createHandle({
      apId: recipient.actor_id,
      name: recipient.user_name,
    }),
    body: pmView.private_message.content,
    read: pmView.private_message.read,
  };
}

function convertMention(replyView: CommentReplyView): Schemas.Reply {
  const { creator, community } = replyView;
  return {
    createdAt: replyView.comment_reply.published,
    id: replyView.comment_reply.id,
    commentId: replyView.comment.id,
    commentApId: replyView.comment.ap_id,
    communityApId: community.actor_id,
    communityHandle: createHandle({
      apId: community.actor_id,
      name: community.name,
    }),
    body: replyView.comment.body,
    path: replyView.comment.path,
    creatorId: replyView.creator.id,
    creatorApId: replyView.creator.actor_id,
    creatorHandle: createHandle({
      apId: creator.actor_id,
      name: creator.user_name,
    }),
    read: replyView.comment_reply.read,
    postId: replyView.post.id,
    postApId: replyView.post.ap_id,
    postName: replyView.post.title,
    deleted: replyView.comment.deleted,
    removed: replyView.comment.removed,
  };
}

function flattenCommentViews(comments: PostReplyView[]): PostReplyView[] {
  const result: PostReplyView[] = [];

  function recurse(nodes: PostReplyView[]) {
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

function convertModlogResponsePieFed(
  response: GetModLogResponse,
): Schemas.ModlogItem[] {
  const baseItem = {
    userId: null,
    userApId: null,
    userHandle: null,
    communityId: null,
    communityApId: null,
    communityHandle: null,
    postId: null,
    postApId: null,
    postTitle: null,
    commentId: null,
    commentApId: null,
    commentContent: null,
  } satisfies Partial<Schemas.ModlogItem>;

  const emptyObject = {
    id: null,
    apId: null,
    handle: null,
  };

  function modFields(person: Person | null | undefined) {
    const p = person ? convertPerson({ person }, "partial") : emptyObject;
    return { modId: p.id, modApId: p.apId, modHandle: p.handle };
  }

  function userFields(person: Person | null | undefined) {
    const p = person ? convertPerson({ person }, "partial") : emptyObject;
    return { userId: p.id, userApId: p.apId, userHandle: p.handle };
  }

  function communityFields(community: Community | null | undefined) {
    const c = community
      ? convertCommunity({ community }, "partial")
      : emptyObject;
    return {
      communityId: c.id,
      communityApId: c.apId,
      communityHandle: c.handle,
    };
  }

  function postFields(post: Post | null | undefined) {
    if (!post) {
      return {};
    }
    return { postId: post.id, postApId: post.ap_id, postTitle: post.title };
  }

  function commentFields(comment: Comment | null | undefined) {
    if (!comment) {
      return {};
    }
    return {
      commentId: comment.id,
      commentApId: comment.ap_id,
      commentContent: comment.body,
    };
  }

  const items: Schemas.ModlogItem[] = [];

  for (const view of response.removed_posts) {
    items.push({
      ...baseItem,
      id: view.mod_remove_post.id,
      actionType: "removed_post",
      isAdminAction: false,
      createdAt: view.mod_remove_post.when_,
      reason: view.mod_remove_post.reason ?? null,
      ...modFields(view.moderator),
      ...communityFields(view.community),
      ...postFields(view.post),
    });
  }

  for (const view of response.locked_posts) {
    items.push({
      ...baseItem,
      id: view.mod_lock_post.id,
      actionType: "locked_post",
      isAdminAction: false,
      createdAt: view.mod_lock_post.when_,
      reason: null,
      ...modFields(view.moderator),
      ...communityFields(view.community),
      ...postFields(view.post),
    });
  }

  for (const view of response.featured_posts) {
    items.push({
      ...baseItem,
      id: view.mod_feature_post.id,
      actionType: "featured_post",
      isAdminAction: false,
      createdAt: view.mod_feature_post.when_,
      reason: null,
      ...modFields(view.moderator),
      ...communityFields(view.community),
      ...postFields(view.post),
    });
  }

  for (const view of response.removed_comments) {
    items.push({
      ...baseItem,
      id: view.mod_remove_comment.id,
      actionType: "removed_comment",
      isAdminAction: false,
      createdAt: view.mod_remove_comment.when_,
      reason: view.mod_remove_comment.reason ?? null,
      ...modFields(view.moderator),
      ...userFields(view.commenter),
      ...communityFields(view.community),
      ...postFields(view.post),
      ...commentFields(view.comment),
    });
  }

  for (const view of response.removed_communities) {
    items.push({
      ...baseItem,
      id: view.mod_remove_community.id,
      actionType: "removed_community",
      isAdminAction: false,
      createdAt: view.mod_remove_community.when_,
      reason: view.mod_remove_community.reason ?? null,
      ...modFields(view.moderator),
      ...communityFields(view.community),
    });
  }

  for (const view of response.banned_from_community) {
    items.push({
      ...baseItem,
      id: view.mod_ban_from_community.id,
      actionType: "banned_from_community",
      isAdminAction: false,
      createdAt: view.mod_ban_from_community.when_,
      reason: view.mod_ban_from_community.reason ?? null,
      ...modFields(view.moderator),
      ...userFields(view.banned_person),
      ...communityFields(view.community),
    });
  }

  for (const view of response.banned) {
    items.push({
      ...baseItem,
      id: view.mod_ban.id,
      actionType: "banned",
      isAdminAction: false,
      createdAt: view.mod_ban.when_,
      reason: view.mod_ban.reason ?? null,
      ...modFields(view.moderator),
      ...userFields(view.banned_person),
    });
  }

  for (const view of response.added_to_community) {
    items.push({
      ...baseItem,
      id: view.mod_add_community.id,
      actionType: "added_to_community",
      isAdminAction: false,
      createdAt: view.mod_add_community.when_,
      reason: null,
      ...modFields(view.moderator),
      ...userFields(view.modded_person),
      ...communityFields(view.community),
    });
  }

  for (const view of response.added) {
    items.push({
      ...baseItem,
      id: view.mod_add.id,
      actionType: "added_admin",
      isAdminAction: true,
      createdAt: view.mod_add.when_,
      reason: null,
      ...modFields(view.moderator),
      ...userFields(view.modded_person),
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

const POLL_UNIT_MS: Record<string, number> = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
};

function pollEndDate(poll: Forms.PollInput): string {
  if (poll.endUnit === "permanent") {
    return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(
    Date.now() +
      poll.endAmount *
        (POLL_UNIT_MS[poll.endUnit] ?? POLL_UNIT_MS["days"] ?? 0),
  ).toISOString();
}

export class PieFedApi
  implements ApiBlueprint<ReturnType<typeof createClient>>
{
  software = Software.PIEFED;
  softwareVersion: string;

  client: ReturnType<typeof createClient>;
  instance: string;
  limit = 25;

  jwt?: string;

  private resolveObjectId = _.memoize(
    async (apId: string) => {
      // This shortcut only works for local objects
      if (apId.startsWith(this.instance)) {
        const local = getIdFromLocalApId(apId);
        if (local) {
          return local;
        }
      }

      try {
        const { post, comment, community, person, feed } =
          await this.client.getApiAlphaResolveObject({ q: apId });

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
    this.client = createClient(this.instance, {
      headers: {
        ...DEFAULT_HEADERS,
        ...(this.jwt
          ? {
              authorization: `Bearer ${this.jwt}`,
            }
          : {}),
      },
      cache: "no-store",
    });
  }

  async getSite(options: RequestOptions) {
    try {
      const pieFedSite = await this.client.getApiAlphaSite(options);
      const pieFedMe = pieFedSite.my_user?.local_user_view?.person;

      const moderates = pieFedSite.my_user?.moderates?.map(({ community }) =>
        convertCommunity({ community }, "partial"),
      );

      const follows = pieFedSite.my_user?.follows?.map(({ community }) =>
        convertCommunity({ community }, "partial"),
      );

      const communityBlocks = _.compact(
        pieFedSite.my_user?.community_blocks?.map(({ community }) =>
          community
            ? shrinkBlockedCommunity(convertCommunity({ community }, "partial"))
            : undefined,
        ),
      );

      const me = pieFedMe
        ? convertPerson({ person: pieFedMe }, "partial")
        : null;

      const personBlocks = pieFedSite.my_user?.person_blocks?.map((block) =>
        shrinkBlockedPerson(convertPerson({ person: block.target }, "partial")),
      );

      const instanceBlocks = pieFedSite.my_user?.instance_blocks?.map((b) => ({
        id: b.instance.id,
        domain: b.instance.domain,
      }));

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
        userCount: pieFedSite.site.user_count ?? null,
        sidebar: pieFedSite.site.sidebar ?? null,
        icon: pieFedSite.site.icon ?? null,
        title: pieFedSite.site.name,
        moderates: moderates?.map((c) => c.handle) ?? null,
        follows: follows?.map((c) => c.handle) ?? null,
        personBlocks: personBlocks?.map((p) => p.apId) ?? null,
        communityBlocks: communityBlocks?.map((c) => c.handle) ?? null,
        instanceBlocks: instanceBlocks ?? null,
        applicationQuestion: null,
        registrationMode: pieFedSite.site.registration_mode ?? "Closed",
        showNsfw:
          pieFedSite.my_user?.local_user_view?.local_user.show_nsfw ?? false,
        blurNsfw: nsfwVisibility !== "show",
        enablePostDownvotes: pieFedSite.site.enable_downvotes ?? true,
        enableCommentDownvotes: pieFedSite.site.enable_downvotes ?? true,
        replyCollapseThreshold:
          pieFedSite.my_user?.local_user_view?.local_user
            .reply_collapse_threshold ?? undefined,
        replyHideThreshold:
          pieFedSite.my_user?.local_user_view?.local_user
            .reply_hide_threshold ?? undefined,
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
      console.error(err);
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

    try {
      const { posts, next_page } = await this.client.getApiAlphaPostList(
        {
          limit: form.limit ?? this.limit,
          page:
            form.pageCursor === INIT_PAGE_TOKEN
              ? undefined
              : pageCursorToInt(form.pageCursor),
          community_name: form.communityHandle,
          sort,
          type_: form.type,
          saved_only: form.savedOnly,
          feed_id,
          ignore_sticky: form.ignoreSticky,
          ...(form.showNsfw ? { nsfw: "Include" } : {}),
        },
        options,
      );
      const filteredPosts = form.showRead
        ? posts
        : posts.filter((p) => !p.read);
      return {
        nextCursor:
          // PieFed has a bug where it returns 0 posts and a next_cursor,
          // so the posts.length check is to prevent DOSing PieFed API
          isNotNil(next_page) && posts.length > 0 ? String(next_page) : null,
        posts: filteredPosts.map((post) => ({
          post: convertPost({ postView: post }),
          creator: convertPerson({ person: post.creator }, "partial"),
          community: convertCommunity({ community: post.community }, "partial"),
          flairs: post.flair_list?.map(convertFlair),
        })),
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getCommunities(form: Forms.GetCommunities, options: RequestOptions) {
    const { data: sort } = communitySortSchema.safeParse(form.sort);
    try {
      const { communities, next_page } =
        await this.client.getApiAlphaCommunityList(
          {
            limit: this.limit,
            page:
              form.pageCursor === INIT_PAGE_TOKEN
                ? undefined
                : pageCursorToInt(form.pageCursor),
            sort: sort === "TopAll" ? "Top" : sort,
            type_: form.type,
            show_nsfw: form.showNsfw,
          },
          options,
        );

      return {
        nextCursor: isNotNil(next_page) ? String(next_page) : null,
        communities: communities.map((c) => convertCommunity(c, "partial")),
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  private convertFeed(feed: FeedView, owner?: Schemas.Person | null) {
    return {
      createdAt: feed.published,
      id: feed.id,
      apId: feed.actor_id,
      handle: createHandle({ apId: feed.actor_id, name: feed.name }),
      name: feed.name,
      icon: feed.icon ?? null,
      banner: feed.banner ?? null,
      nsfw: feed.nsfw,
      communityCount: feed.communities_count,
      subscriberCount: feed.subscriptions_count,
      description: feed.description ?? null,
      subscribed: feed.subscribed ?? null,
      // If communities is absent or empty despite a non-zero count, the endpoint
      // didn't include them (e.g. include_communities=false). Return undefined so
      // callers can distinguish "not loaded" from "genuinely empty".
      communityHandles:
        feed.communities !== null &&
        (feed.communities.length > 0 || feed.communities_count === 0)
          ? feed.communities.map((c) =>
              createHandle({ apId: c.actor_id, name: c.name }),
            )
          : undefined,
      ownerId: owner?.id ?? null,
      ownerApId: owner?.apId ?? null,
      ownerHandle: owner?.handle ?? null,
    };
  }

  async getMultiCommunityFeeds(
    form: Forms.GetMultiCommunityFeeds,
    options?: RequestOptions,
  ) {
    try {
      const { feeds } = await this.client.getApiAlphaFeedList({}, options);
      return {
        multiCommunityFeeds: feeds.map((feed) => this.convertFeed(feed)),
        nextCursor: null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getMultiCommunityFeed(
    form: Forms.GetMultiCommunityFeed,
    options?: RequestOptions,
  ) {
    try {
      const { feed_id } = await this.resolveObjectId(form.apId);

      const feed = await this.client.getApiAlphaFeed({ id: feed_id }, options);

      const communities = (feed.communities ?? []).map((community) =>
        convertCommunity({ community }, "partial"),
      );

      // PieFed returns only the owner's local ID — fetch full person details.
      let owner: Schemas.Person | null = null;
      if (_.isNumber(feed.user_id)) {
        try {
          const { person_view } = await this.client.getApiAlphaUser(
            { person_id: feed.user_id },
            options,
          );
          owner = convertPerson({ person: person_view.person }, "partial");
        } catch {
          // Owner is optional — don't fail the whole request if fetch fails
        }
      }

      return {
        feed: this.convertFeed(feed, owner),
        communities,
        owner,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async followFeed(
    form: Forms.FollowFeed,
  ): Promise<Schemas.MultiCommunityFeed> {
    const feed = await this.client.postApiAlphaFeedFollow({
      feed_id: form.feedId,
      follow: form.follow,
    });
    return this.convertFeed(feed);
  }

  async getCommunity(form: Forms.GetCommunity, options?: RequestOptions) {
    if (!form.handle) {
      throw new Error("community handle required");
    }

    const { community_view, moderators } =
      await this.client.getApiAlphaCommunity({ name: form.handle }, options);

    try {
      return {
        community: convertCommunity(community_view, "full"),
        mods: moderators.map((m) =>
          convertPerson({ person: m.moderator }, "partial"),
        ),
        flairs: community_view.flair_list?.map(convertFlair),
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getPerson(form: Forms.GetPerson, options: RequestOptions) {
    if (z.string().url().safeParse(form.apIdOrUsername).success) {
      const { person_id } = await this.resolveObjectId(form.apIdOrUsername);
      if (_.isNil(person_id)) {
        throw new Error("person not found for apId");
      }
      try {
        const data = await this.client.getApiAlphaUser({ person_id }, options);
        return convertPerson(data.person_view, "full");
      } catch (err) {
        console.log(err);
        throw err;
      }
    } else {
      try {
        const data = await this.client.getApiAlphaUser(
          { username: form.apIdOrUsername },
          options,
        );
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
    this.client.postApiAlphaPostMarkAsRead({
      post_ids: [post_id],
      read: true,
    });

    try {
      const { post_view, community_view, cross_posts, moderators } =
        await this.client.getApiAlphaPost({ id: post_id }, options);

      return {
        post: convertPost({
          postView: post_view,
          crossPosts: cross_posts ?? [],
        }),
        community: community_view
          ? convertCommunity(community_view, "partial")
          : undefined,
        profiles: [
          ...(moderators?.map((m) => m.moderator) ?? []),
          post_view.creator,
        ].map((person) => convertPerson({ person }, "partial")),
        flairs: post_view.flair_list?.map(convertFlair),
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async login(form: Forms.Login): Promise<{ jwt: string }> {
    try {
      return await this.client.postApiAlphaUserLogin({
        username: form.username,
        password: form.password,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async likePost(form: Forms.LikePost) {
    try {
      const data = await this.client.postApiAlphaPostLike({
        post_id: form.postId,
        score: form.score,
      });
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async addPostReactionEmoji(form: Forms.AddPostReactionEmoji) {
    await this.client.postApiAlphaPostLike({
      post_id: form.postId,
      emoji: form.emoji ?? undefined,
      score: !form.score ? 1 : form.score,
    });
    const { post_view } = await this.client.getApiAlphaPost({
      id: form.postId,
    });
    return convertPost({ postView: post_view });
  }

  async votePostPoll(form: Forms.PostPollVote) {
    try {
      const { post_view } = await this.client.postApiAlphaPostPollVote({
        post_id: form.postId,
        choice_id: form.choiceId,
      });
      return convertPost({ postView: post_view });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async savePost(form: Forms.SavePost): Promise<Schemas.Post> {
    try {
      const data = await this.client.putApiAlphaPostSave({
        post_id: form.postId,
        save: form.save,
      });
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.error(err);
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

      if (form.savedOnly) {
        const { comments, next_page } =
          await this.client.getApiAlphaCommentList(
            {
              limit: this.limit,
              sort,
              page:
                form.pageCursor === INIT_PAGE_TOKEN
                  ? undefined
                  : pageCursorToInt(form.pageCursor),
              parent_id: form.parentId,
              max_depth: form.maxDepth,
              saved_only: form.savedOnly,
              type_: "All",
            },
            options,
          );

        return {
          comments: comments.map((c) => convertComment(c)),
          creators: comments.map(({ creator }) =>
            convertPerson({ person: creator }, "partial"),
          ),
          nextCursor: isNotNil(next_page) ? String(next_page) : null,
        };
      } else {
        const post_id = (await this.resolveObjectId(form.postApId)).post_id;
        if (_.isNil(post_id)) {
          throw new Error("could not find post");
        }

        // PieFed has post and community as optional
        // in the reply schema, so we need to stitch the data
        // together from these two requests
        const [{ comments, next_page }, { post_view }] = await Promise.all([
          this.client.getApiAlphaPostReplies(
            {
              limit: 100,
              sort,
              page:
                form.pageCursor === INIT_PAGE_TOKEN
                  ? undefined
                  : form.pageCursor,
              parent_id: form.parentId,
              post_id,
              max_depth: form.maxDepth,
              // @ts-expect-error type_ is missing from piefed's input schema but is implemented
              type_: "All",
            },
            options,
          ),
          this.client.getApiAlphaPost({
            id: post_id,
          }),
        ]);

        const flattenedComments = comments
          ? flattenCommentViews(comments)
          : undefined;

        return {
          comments:
            flattenedComments?.map((c) =>
              convertComment({
                ...c,
                post: post_view.post,
                community: post_view.community,
              }),
            ) ?? [],
          creators:
            flattenedComments?.map(({ creator }) =>
              convertPerson({ person: creator }, "partial"),
            ) ?? [],
          nextCursor: isNotNil(next_page) ? String(next_page) : null,
        };
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async likeComment(form: Forms.LikeComment) {
    try {
      await this.client.postApiAlphaCommentLike({
        comment_id: form.id,
        score: form.score,
      });

      const data = await this.client.getApiAlphaComment({ id: form.id });
      return convertComment(data.comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async addCommentReactionEmoji(form: Forms.AddCommentReactionEmoji) {
    await this.client.postApiAlphaCommentLike({
      comment_id: form.commentId,
      emoji: form.emoji,
      // PieFed requires a score of -1 or 1 to react
      score: !form.score ? 1 : form.score,
    });
    const data = await this.client.getApiAlphaComment({ id: form.commentId });
    return convertComment(data.comment_view);
  }

  async saveComment(form: Forms.SaveComment): Promise<Schemas.Comment> {
    try {
      const data = await this.client.putApiAlphaCommentSave({
        comment_id: form.commentId,
        save: form.save,
      });
      return convertComment(data.comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async followCommunity(
    form: Forms.FollowCommunity,
  ): Promise<Schemas.Community> {
    try {
      const data = await this.client.postApiAlphaCommunityFollow({
        community_id: form.communityId,
        follow: form.follow,
      });
      return convertCommunity(data.community_view, "partial");
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async search(form: Forms.Search, options: RequestOptions) {
    const topSort = form.type === "Communities" || form.type === "Users";
    try {
      const page =
        form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : (pageCursorToInt(form.pageCursor) ?? 1);

      const { posts, communities, users, comments } =
        await this.client.getApiAlphaSearch(
          {
            q: form.q,
            community_name: form.communityHandle,
            page,
            type_: form.type === "All" ? "Posts" : form.type,
            limit: form.limit ?? this.limit,
            sort: topSort ? "TopAll" : "Active",
          },
          options,
        );

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
        nextCursor: hasNextCursor ? String(page + 1) : null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async deletePost(form: Forms.DeletePost): Promise<Schemas.Post> {
    try {
      const data = await this.client.postApiAlphaPostDelete({
        post_id: form.postId,
        deleted: form.deleted,
      });
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async createComment(form: Forms.CreateComment): Promise<Schemas.Comment> {
    const { post_id } = await this.resolveObjectId(form.postApId);
    if (_.isNil(post_id)) {
      throw new Error("post not found");
    }

    try {
      const { comment_view } = await this.client.postApiAlphaComment({
        body: form.body,
        post_id,
        parent_id: form.parentId,
      });
      return convertComment(comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async deleteComment(form: Forms.DeleteComment): Promise<Schemas.Comment> {
    try {
      const { comment_view } = await this.client.postApiAlphaCommentDelete({
        comment_id: form.id,
        deleted: form.deleted,
      });
      return convertComment(comment_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async editComment(form: Forms.EditComment): Promise<Schemas.Comment> {
    try {
      const { comment_view } = await this.client.putApiAlphaComment({
        comment_id: form.id,
        body: form.body,
      });
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

    try {
      if (form.type === "Posts") {
        const { posts, next_page } = await this.client.getApiAlphaPostList(
          {
            ...personOrUsername,
            limit: this.limit,
            sort: "New",
            page:
              form.pageCursor === INIT_PAGE_TOKEN
                ? undefined
                : pageCursorToInt(form.pageCursor),
            type_: "All",
          },
          options,
        );
        return {
          posts: posts?.map((p) => convertPost({ postView: p })) ?? [],
          comments: [],
          nextCursor: isNotNil(next_page) ? String(next_page) : null,
        };
      } else {
        const { comments, next_page } =
          await this.client.getApiAlphaCommentList(
            {
              ...personOrUsername,
              limit: this.limit,
              sort: "New",
              page:
                form.pageCursor === INIT_PAGE_TOKEN
                  ? undefined
                  : pageCursorToInt(form.pageCursor),
              type_: "All",
            },
            options,
          );
        return {
          posts: [],
          comments: comments?.map((c) => convertComment(c)) ?? [],
          nextCursor: isNotNil(next_page) ? String(next_page) : null,
        };
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async editPost(form: Forms.EditPost) {
    const { post_id } = await this.resolveObjectId(form.apId);
    if (_.isNil(post_id)) {
      throw new Error("post not found");
    }
    try {
      const data = await this.client.putApiAlphaPost({
        post_id,
        title: form.title,
        // PieFed will drop the poll if we send url
        url: form.poll ? undefined : form.url,
        body: form.body ?? undefined,
        nsfw: form.nsfw ?? false,
        ...(form.poll
          ? {
              poll: {
                end_poll: pollEndDate(form.poll),
                mode: form.poll.mode,
                local_only: form.poll.localOnly,
                choices: form.poll.choices.map((c) => ({
                  id: c.id,
                  choice_text: c.text,
                  sort_order: c.sortOrder,
                })),
              },
            }
          : {}),
      });
      if (form.flairs) {
        const { flairs } = await this.getCommunity({
          handle: convertPost({ postView: data.post_view }).communityHandle,
        });
        const flairLookup = getFlairLookup(flairs);
        const selectedFlairs = form.flairs?.map(flairLookup).filter(isNotNil);
        await this.client.postApiAlphaPostAssignFlair({
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
      handle: form.communityHandle,
    });
    try {
      const data = await this.client.postApiAlphaPost({
        title: form.title,
        community_id: community.id,
        url: form.url ?? undefined,
        body: form.body ?? undefined,
        nsfw: form.nsfw ?? false,
        ...(form.poll
          ? {
              poll: {
                end_poll: pollEndDate(form.poll),
                mode: form.poll.mode,
                local_only: form.poll.localOnly,
                choices: form.poll.choices.map((c) => ({
                  id: c.id,
                  choice_text: c.text,
                  sort_order: c.sortOrder,
                })),
              },
            }
          : {}),
      });
      const flairLookup = getFlairLookup(flairs);
      const selectedFlairs = form.flairs?.map(flairLookup).filter(isNotNil);
      if (selectedFlairs) {
        await this.client.postApiAlphaPostAssignFlair({
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
    await this.client.postApiAlphaPostMarkAsRead({
      post_ids: form.postIds,
      read: form.read,
    });
  }

  async getPrivateMessages(
    form: Forms.GetPrivateMessages,
    options: RequestOptions,
  ) {
    try {
      const page =
        form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : (pageCursorToInt(form.pageCursor) ?? 1);

      const { private_messages } =
        await this.client.getApiAlphaPrivateMessageList(
          {
            unread_only: form.unreadOnly ?? false,
            page,
            limit: this.limit,
          },
          options,
        );

      const profiles = _.uniqBy(
        [
          ...private_messages.map((pm) => pm.creator),
          ...private_messages.map((pm) => pm.recipient),
        ],
        (p) => p.actor_id,
      ).map((person) => convertPerson({ person }, "partial"));

      const hasNextPage = private_messages.length >= this.limit;

      return {
        privateMessages: private_messages.map(convertPrivateMessage),
        profiles,
        nextCursor: hasNextPage ? String(page + 1) : null,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async createPrivateMessage(form: Forms.CreatePrivateMessage) {
    try {
      const { private_message_view } =
        await this.client.postApiAlphaPrivateMessage({
          content: form.body,
          recipient_id: form.recipientId,
        });
      return convertPrivateMessage(private_message_view);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async markPrivateMessageRead(form: Forms.MarkPrivateMessageRead) {
    await this.client.postApiAlphaPrivateMessageMarkAsRead({
      private_message_id: form.id,
      read: form.read,
    });
  }

  async featurePost(form: Forms.FeaturePost) {
    try {
      const data = await this.client.postApiAlphaPostFeature({
        post_id: form.postId,
        featured: form.featured,
        feature_type: form.featureType,
      });
      return convertPost({ postView: data.post_view });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getReplies(form: Forms.GetReplies, option: RequestOptions) {
    try {
      const { replies, next_page } = await this.client.getApiAlphaUserReplies(
        {
          page:
            form.pageCursor === INIT_PAGE_TOKEN
              ? undefined
              : pageCursorToInt(form.pageCursor),
          limit: this.limit,
          unread_only: form.unreadOnly,
        },
        option,
      );

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
    try {
      const { replies, next_page } = await this.client.getApiAlphaUserMentions(
        {
          page:
            form.pageCursor === INIT_PAGE_TOKEN
              ? undefined
              : pageCursorToInt(form.pageCursor),
          limit: this.limit,
          unread_only: form.unreadOnly,
        },
        options,
      );

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
    await this.client.postApiAlphaUserMarkAllAsRead();
  }

  async markReplyRead(form: Forms.MarkReplyRead) {
    await this.client.postApiAlphaCommentMarkAsRead({
      comment_reply_id: form.id,
      read: form.read,
    });
  }

  async markMentionRead(form: Forms.MarkMentionRead) {
    await this.markReplyRead(form);
  }

  async createPostReport(form: Forms.CreatePostReport) {
    await this.client.postApiAlphaPostReport({
      post_id: form.postId,
      reason: form.reason,
    });
  }

  async removePost(form: Forms.RemovePost) {
    const { post_view, cross_posts } = await this.client.postApiAlphaPostRemove(
      {
        post_id: form.postId,
        removed: form.removed,
        reason: form.reason,
      },
    );
    return convertPost({
      postView: post_view,
      crossPosts: cross_posts ?? undefined,
    });
  }

  async lockPost(form: Forms.LockPost) {
    const { post_view } = await this.client.postApiAlphaPostLock({
      post_id: form.postId,
      locked: form.locked,
    });
    return convertPost({ postView: post_view });
  }

  async createCommentReport(form: Forms.CreateCommentReport) {
    await this.client.postApiAlphaCommentReport({
      comment_id: form.commentId,
      reason: form.reason,
    });
  }

  async removeComment(form: Forms.RemoveComment) {
    const { comment_view } = await this.client.postApiAlphaCommentRemove({
      comment_id: form.commentId,
      removed: form.removed,
      reason: form.reason,
    });
    return convertComment(comment_view);
  }

  async lockComment(form: Forms.LockComment) {
    const { comment_view } = await this.client.postApiAlphaCommentLock({
      comment_id: form.commentId,
      locked: form.locked,
    });
    return convertComment(comment_view);
  }

  async markCommentAsAnswer(form: Forms.MarkCommentAsAnswer) {
    const { comment_reply_view } =
      await this.client.postApiAlphaCommentMarkAsAnswer({
        comment_reply_id: form.commentId,
        answer: form.answer,
      });
    return convertComment(comment_reply_view);
  }

  async blockPerson(form: Forms.BlockPerson) {
    await this.client.postApiAlphaUserBlock({
      person_id: form.personId,
      block: form.block,
    });
  }

  async blockCommunity(form: Forms.BlockCommunity) {
    await this.client.postApiAlphaCommunityBlock({
      community_id: form.communityId,
      block: form.block,
    });
  }

  async blockInstance(form: Forms.BlockInstance) {
    await this.client.postApiAlphaSiteBlock({
      instance_id: form.instanceId,
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
    await this.client.putApiAlphaUserSaveUserSettings({
      avatar: avatar,
      // banner: form.banner,
      bio: form.bio,
      nsfw_visibility: form.showNsfw
        ? form.blurNsfw
          ? "Blur"
          : "Show"
        : "Hide",
      show_nsfw: form.showNsfw ?? false,
      reply_collapse_threshold: form.replyCollapseThreshold,
      reply_hide_threshold: form.replyHideThreshold,
    });
  }

  async removeUserAvatar() {
    await this.client.putApiAlphaUserSaveUserSettings({
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
      const { post, community, person, comment, feed } =
        await this.client.getApiAlphaResolveObject({ q: form.q }, options);

      return resolveObjectResponseSchema.parse({
        post: post ? convertPost({ postView: post }) : null,
        community: community ? convertCommunity(community, "partial") : null,
        user: person ? convertPerson(person, "partial") : null,
        comment: comment ? convertComment(comment) : null,
        feed: feed ? this.convertFeed(feed) : null,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getLinkMetadata(form: Forms.GetLinkMetadata) {
    try {
      const { metadata } = await this.client.getApiAlphaPostSiteMetadata({
        url: form.url,
      });
      return {
        title: metadata.title,
        description: metadata.title,
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
    if (form.communityHandle) {
      const { community } = await this.getCommunity(
        { handle: form.communityHandle },
        options,
      );
      community_id = community.id;
    }

    const page =
      form.pageCursor === INIT_PAGE_TOKEN
        ? 1
        : (pageCursorToInt(form.pageCursor) ?? 1);

    try {
      const json = await this.client.getApiAlphaModlog(
        { ...(community_id ? { community_id } : {}), page, limit: this.limit },
        options,
      );
      const items = convertModlogResponsePieFed(json);
      const hasNextPage = Object.values(json).some(
        (arr) => Array.isArray(arr) && arr.length >= this.limit,
      );
      return { items, nextCursor: hasNextPage ? String(page + 1) : null };
    } catch (err) {
      console.error(err);
      throw err;
    }
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
