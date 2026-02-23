import { env } from "@/src/env";
import * as lemmyV3 from "lemmy-v3";
import {
  ApiBlueprint,
  Schemas,
  RequestOptions,
  Forms,
  INIT_PAGE_TOKEN,
  Errors,
  Software,
  resolveObjectResponseSchema,
} from "./api-blueprint";
import { createSlug } from "../utils";
import _ from "lodash";
import z from "zod";
import { ErrorLike, isErrorLike } from "../../utils";
import { getIdFromLocalApId } from "./lemmy-common";
import { shrinkBlockedCommunity, shrinkBlockedPerson } from "./utils";

function translateError(err: ErrorLike): Error {
  const name = err.name.trim().toLowerCase();
  const msg = err.message.trim().toLowerCase();

  // Not found errors
  if (
    name === "couldnt_find_object" ||
    name === "couldnt_find_community" ||
    msg === "federation disabled"
  ) {
    return Errors.OBJECT_NOT_FOUND;
  }

  // MFA errors
  if (
    name.includes("missing_totp_token") ||
    msg.includes("missing_totp_token")
  ) {
    return Errors.MFA_REQUIRED;
  }

  return err;
}

async function translateErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw isErrorLike(err) ? translateError(err) : err;
  }
}

const POST_SORTS: lemmyV3.SortType[] = [
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
  "MostComments",
  "NewComments",
  "Controversial",
  "Scaled",
];
const postSortSchema = z.custom<lemmyV3.SortType>((sort) => {
  return _.isString(sort) && POST_SORTS.includes(sort as any);
});

const COMMENT_SORTS: lemmyV3.CommentSortType[] = [
  "Hot",
  "Top",
  "New",
  "Old",
  "Controversial",
];

const commentSortSchema = z.custom<lemmyV3.CommentSortType>((sort) => {
  return _.isString(sort) && COMMENT_SORTS.includes(sort as any);
});

const COMMUNITY_SORTS: lemmyV3.SortType[] = [
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
  "MostComments",
  "NewComments",
  "Controversial",
  "Scaled",
] as const;
const communitySortSchema = z.custom<lemmyV3.SortType>((sort) => {
  return _.isString(sort) && COMMUNITY_SORTS.includes(sort as any);
});

const DEFAULT_HEADERS = {
  // lemmy.ml will reject requests if
  // User-Agent header is not present
  "User-Agent": env.REACT_APP_NAME.toLowerCase(),
};

function cursorToInt(pageCursor: string | null | undefined) {
  if (pageCursor === INIT_PAGE_TOKEN) {
    return 1;
  }
  return pageCursor ? _.parseInt(pageCursor) : undefined;
}

function convertCommunity(
  communityView: lemmyV3.CommunityView | { community: lemmyV3.Community },
): Schemas.Community {
  const counts = "counts" in communityView ? communityView.counts : null;
  const subscribed =
    "subscribed" in communityView ? communityView.subscribed : null;
  const { community } = communityView;
  return {
    createdAt: community.published,
    id: community.id,
    apId: community.actor_id,
    slug: createSlug({ apId: community.actor_id, name: community.name }).slug,
    icon: community.icon ?? null,
    banner: community.banner ?? null,
    description: community.description ?? null,
    ...(counts
      ? {
          usersActiveDayCount: counts.users_active_day,
          usersActiveWeekCount: counts.users_active_week,
          usersActiveMonthCount: counts.users_active_month,
          usersActiveHalfYearCount: counts.users_active_half_year,
          postCount: counts.posts,
          commentCount: counts.comments,
          subscriberCount: counts.subscribers,
          subscribersLocalCount: counts.subscribers_local,
        }
      : {}),
    ...(subscribed
      ? {
          subscribed,
        }
      : {}),
  };
}

function convertPerson({
  person,
  counts,
}:
  | lemmyV3.PersonView
  | { person: lemmyV3.Person; counts?: undefined }): Schemas.Person {
  return {
    apId: person.actor_id,
    id: person.id,
    avatar: person.avatar ?? null,
    bio: person.bio ?? null,
    matrixUserId: person.matrix_user_id ?? null,
    slug: createSlug({ apId: person.actor_id, name: person.name }).slug,
    deleted: person.deleted,
    createdAt: person.published,
    isBot: person.bot_account,
    isBanned: person.banned,
    ...(counts
      ? {
          postCount: counts?.post_count ?? null,
          commentCount: counts?.comment_count ?? null,
        }
      : {}),
  };
}

function convertPost(
  postView: lemmyV3.PostView,
  crossPosts?: lemmyV3.PostView[],
): Schemas.Post {
  const { post, counts, community, creator } = postView;
  const ar = postView.image_details
    ? postView.image_details.width / postView.image_details.height
    : null;
  return {
    locked: post.locked,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
    url: post.url ?? null,
    urlContentType: post.url_content_type ?? null,
    creatorId: post.creator_id,
    createdAt: post.published,
    isBannedFromCommunity: postView.creator_banned_from_community,
    id: post.id,
    apId: post.ap_id,
    title: post.name,
    body: post.body ?? null,
    thumbnailUrl: post.thumbnail_url ?? null,
    embedVideoUrl: post.embed_video_url ?? null,
    upvotes: counts.upvotes,
    downvotes: counts.downvotes,
    myVote: postView.my_vote,
    commentsCount: counts.comments,
    deleted: post.deleted,
    removed: post.removed,
    thumbnailAspectRatio: ar,
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
    featuredCommunity: post.featured_community,
    featuredLocal: post.featured_local,
    read: postView.read,
    saved: postView.saved,
    nsfw: post.nsfw || community.nsfw,
    altText: post.alt_text ?? null,
    flairs: [],
    emojiReactions: [],
  };
}
function convertComment(commentView: lemmyV3.CommentView): Schemas.Comment {
  const { post, counts, creator, comment, community } = commentView;
  return {
    locked: false,
    createdAt: comment.published,
    id: comment.id,
    apId: comment.ap_id,
    body: comment.content,
    creatorId: creator.id,
    creatorApId: creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
    isBannedFromCommunity: commentView.creator_banned_from_community,
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
    postTitle: post.name,
    myVote: commentView.my_vote ?? null,
    childCount: counts.child_count,
    saved: commentView.saved,
    answer: false,
    emojiReactions: [],
  };
}
function convertPrivateMessage(
  pmView: lemmyV3.PrivateMessageView,
): Schemas.PrivateMessage {
  const { creator, recipient } = pmView;
  return {
    createdAt: pmView.private_message.published,
    id: pmView.private_message.id,
    creatorApId: creator.actor_id,
    creatorId: creator.id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
    recipientApId: recipient.actor_id,
    recipientId: recipient.id,
    recipientSlug: createSlug({
      apId: recipient.actor_id,
      name: recipient.name,
    }).slug,
    body: pmView.private_message.content,
    read: pmView.private_message.read,
  };
}
function convertReply(replyView: lemmyV3.CommentReplyView): Schemas.Reply {
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
    body: replyView.comment.content,
    path: replyView.comment.path,
    creatorId: replyView.creator.id,
    creatorApId: replyView.creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
    read: replyView.comment_reply.read,
    postId: replyView.post.id,
    postApId: replyView.post.ap_id,
    postName: replyView.post.name,
    deleted: replyView.comment.deleted,
    removed: replyView.comment.removed,
  };
}

function convertMention(replyView: lemmyV3.PersonMentionView): Schemas.Reply {
  const { creator, community } = replyView;
  return {
    createdAt: replyView.person_mention.published,
    id: replyView.person_mention.id,
    commentId: replyView.comment.id,
    commentApId: replyView.comment.ap_id,
    communityApId: community.actor_id,
    communitySlug: createSlug({
      apId: community.actor_id,
      name: community.name,
    }).slug,
    body: replyView.comment.content,
    path: replyView.comment.path,
    creatorId: replyView.creator.id,
    creatorApId: replyView.creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
    read: replyView.person_mention.read,
    postId: replyView.post.id,
    postApId: replyView.post.ap_id,
    postName: replyView.post.name,
    deleted: replyView.comment.deleted,
    removed: replyView.comment.removed,
  };
}

function convertPostReport(report: lemmyV3.PostReportView) {
  return {
    resolved: report.post_report.resolved,
    createdAt: report.post_report.published,
    id: report.post_report.id,
    postId: report.post.id,
    postApId: report.post.ap_id,
    creatorId: report.creator.id,
    creatorApId: report.creator.actor_id,
    creatorSlug: createSlug({
      apId: report.creator.actor_id,
      name: report.creator.name,
    }).slug,
    resolverId: report.resolver?.id ?? null,
    resolverApId: report.resolver?.actor_id ?? null,
    resolverSlug: report.resolver
      ? createSlug({
          apId: report.resolver.actor_id,
          name: report.resolver.name,
        }).slug
      : null,
    originalPostName: report.post_report.original_post_name,
    originalPostBody: report.post_report.original_post_body ?? null,
    originalPostUrl: report.post_report.original_post_url ?? null,
    reason: report.post_report.reason,
  };
}

function convertCommentReport(
  report: lemmyV3.CommentReportView,
): Schemas.CommentReport {
  return {
    resolved: report.comment_report.resolved,
    createdAt: report.comment_report.published,
    id: report.comment_report.id,
    commentId: report.comment.id,
    commentApId: report.comment.ap_id,
    commentPath: report.comment.path,
    creatorId: report.creator.id,
    creatorApId: report.creator.actor_id,
    creatorSlug: createSlug({
      apId: report.creator.actor_id,
      name: report.creator.name,
    }).slug,
    resolverId: report.resolver?.id ?? null,
    resolverApId: report.resolver?.actor_id ?? null,
    resolverSlug: report.resolver
      ? createSlug({
          apId: report.resolver.actor_id,
          name: report.resolver.name,
        }).slug
      : null,
    reason: report.comment_report.reason,
  };
}

export class LemmyV3Api implements ApiBlueprint<lemmyV3.LemmyHttp> {
  software = Software.LEMMY;
  softwareVersion: string;

  client: lemmyV3.LemmyHttp;
  instance: string;
  limit = 50;

  private resolveObjectId = _.memoize(
    async (apId: string) =>
      translateErrors(async () => {
        // This shortcut only works for local objects
        if (apId.startsWith(this.instance)) {
          const local = getIdFromLocalApId(apId);
          if (local) {
            return local;
          }
        }

        const { post, comment, community, person } =
          await this.client.resolveObject({
            q: apId,
          });
        return {
          post_id: post?.post.id,
          comment_id: comment?.comment.id,
          community_id: community?.community.id,
          person_id: person?.person.id,
        };
      }),
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
    this.client = new lemmyV3.LemmyHttp(this.instance, {
      headers: DEFAULT_HEADERS,
      fetchFunction: (arg1, arg2) =>
        fetch(arg1, {
          cache: "no-cache",
          ...arg2,
        }),
    });
    if (jwt) {
      this.client.setHeaders({
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${jwt}`,
      });
    }
  }

  async getSite(options: RequestOptions) {
    return translateErrors(async () => {
      const lemmySite = await this.client.getSite(options);
      const lemmyMe = lemmySite.my_user?.local_user_view.person;
      // TODO: figure out why lemmy types are broken here
      const enableDownvotes =
        "enable_downvotes" in lemmySite.site_view.local_site &&
        lemmySite.site_view.local_site.enable_downvotes === true;

      const moderates = lemmySite.my_user?.moderates.map(({ community }) =>
        convertCommunity({ community }),
      );

      const follows = lemmySite.my_user?.follows.map(({ community }) =>
        convertCommunity({ community }),
      );

      const personBlocks = lemmySite.my_user?.person_blocks.map((p) =>
        shrinkBlockedPerson(convertPerson({ person: p.target })),
      );

      const communityBlocks = lemmySite.my_user?.community_blocks.map(
        ({ community }) =>
          shrinkBlockedCommunity(convertCommunity({ community })),
      );

      const me = lemmyMe ? convertPerson({ person: lemmyMe }) : null;

      const admins = lemmySite.admins.map((p) => convertPerson(p));

      const site = {
        privateInstance: lemmySite.site_view.local_site.private_instance,
        public: lemmySite,
        description: lemmySite.site_view.site.description ?? null,
        instance: this.instance,
        admins: admins.map((a) => a.apId),
        me,
        myEmail: lemmySite.my_user?.local_user_view.local_user.email ?? null,
        version: lemmySite.version,
        usersActiveDayCount: lemmySite.site_view.counts.users_active_day,
        usersActiveWeekCount: lemmySite.site_view.counts.users_active_week,
        usersActiveMonthCount: lemmySite.site_view.counts.users_active_month,
        usersActiveHalfYearCount:
          lemmySite.site_view.counts.users_active_half_year,
        postCount: lemmySite.site_view.counts.posts,
        commentCount: lemmySite.site_view.counts.comments,
        userCount: lemmySite.site_view.counts.users,
        sidebar: lemmySite.site_view.site.sidebar ?? null,
        icon: lemmySite.site_view.site.icon ?? null,
        title: lemmySite.site_view.site.name,
        moderates: moderates?.map((c) => c.slug) ?? null,
        follows: follows?.map((c) => c.slug) ?? null,
        personBlocks: personBlocks?.map((p) => p.apId) ?? null,
        communityBlocks: communityBlocks?.map((c) => c.slug) ?? null,
        applicationQuestion:
          lemmySite.site_view.local_site.application_question ?? null,
        registrationMode: lemmySite.site_view.local_site.registration_mode,
        showNsfw:
          lemmySite.my_user?.local_user_view.local_user.show_nsfw ?? false,
        blurNsfw:
          lemmySite.my_user?.local_user_view.local_user.blur_nsfw ?? true,
        hideDownvotes:
          lemmySite.site_view.local_site.enable_downvotes === false,
        enablePostDownvotes: enableDownvotes,
        enableCommentDownvotes: enableDownvotes,
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
    });
  }

  async getPost(form: { apId: string }, options: RequestOptions) {
    return translateErrors(async () => {
      const { post_id } = await this.resolveObjectId(form.apId);
      if (_.isNil(post_id)) {
        throw Errors.OBJECT_NOT_FOUND;
      }
      const fullPost = await this.client.getPost(
        {
          id: post_id,
        },
        options,
      );
      return {
        post: convertPost(fullPost.post_view, fullPost.cross_posts),
        creator: convertPerson({ person: fullPost.post_view.creator }),
      };
    });
  }

  async getPosts(form: Forms.GetPosts, options: RequestOptions) {
    return translateErrors(async () => {
      const { data: sort } = postSortSchema.safeParse(form.sort);

      const posts = await this.client.getPosts(
        {
          show_read: form.showRead,
          sort,
          type_: form.type,
          page_cursor:
            form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
          limit: this.limit,
          community_name: form.communitySlug,
          saved_only: form.savedOnly,
        },
        options,
      );
      return {
        nextCursor: posts.next_page ?? null,
        posts: posts.posts.map((p) => ({
          post: convertPost(p),
          creator: convertPerson({ person: p.creator }),
          community: convertCommunity({ community: p.community }),
        })),
      };
    });
  }

  async votePostPoll() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async savePost(form: Forms.SavePost) {
    return translateErrors(async () => {
      const { post_view } = await this.client.savePost({
        post_id: form.postId,
        save: form.save,
      });
      return convertPost(post_view);
    });
  }

  async likePost(form: Forms.LikePost) {
    return translateErrors(async () => {
      const { post_view } = await this.client.likePost({
        post_id: form.postId,
        score: form.score,
      });
      return convertPost(post_view);
    });
  }

  async deletePost(form: Forms.DeletePost) {
    return translateErrors(async () => {
      const { post_view } = await this.client.deletePost({
        post_id: form.postId,
        deleted: form.deleted,
      });
      return convertPost(post_view);
    });
  }

  async featurePost(form: Forms.FeaturePost) {
    return translateErrors(async () => {
      const { post_view } = await this.client.featurePost({
        post_id: form.postId,
        featured: form.featured,
        feature_type: form.featureType,
      });
      return convertPost(post_view);
    });
  }

  async getPerson(form: Forms.GetPerson, options: RequestOptions) {
    return translateErrors(async () => {
      if (z.string().url().safeParse(form.apIdOrUsername).success) {
        const { person } = await this.client.resolveObject(
          {
            q: form.apIdOrUsername,
          },
          options,
        );

        if (!person) {
          throw new Error("person not found");
        }

        return convertPerson(person);
      } else {
        const { person_view } = await this.client.getPersonDetails(
          {
            username: form.apIdOrUsername,
          },
          options,
        );
        return convertPerson(person_view);
      }
    });
  }

  async getPersonContent(
    form: Forms.GetPersonContent,
    options: RequestOptions,
  ) {
    return translateErrors(async () => {
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

      const { posts, comments } = await this.client.getPersonDetails(
        {
          ...personOrUsername,
          sort: "New",
          limit: this.limit,
          page:
            _.isUndefined(form.pageCursor) ||
            form.pageCursor === INIT_PAGE_TOKEN
              ? 1
              : _.parseInt(form.pageCursor) + 1,
        },
        options,
      );

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;
      const hasNextCursor = posts.length >= this.limit;

      return {
        posts: posts.map((p) => convertPost(p)),
        comments: comments.map(convertComment),
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    });
  }

  async search(form: Forms.Search, options: RequestOptions) {
    return translateErrors(async () => {
      const cursor = cursorToInt(form.pageCursor) ?? 1;
      const topSort =
        form.type === "Communities" ||
        form.type === "Users" ||
        form.type === "All";
      const { posts, communities, users, comments } = await this.client.search(
        {
          q: form.q,
          community_name: form.communitySlug,
          page: cursor,
          type_: form.type,
          limit: form.limit ?? this.limit,
          sort: topSort ? "TopAll" : "Active",
        },
        options,
      );
      const hasMorePosts = posts.length > this.limit;
      const hasMoreCommunities = communities.length > this.limit;
      const hasMoreUsers = users.length > this.limit;
      const hasMoreComments = comments.length > this.limit;
      const nextCursor =
        hasMorePosts || hasMoreCommunities || hasMoreUsers || hasMoreComments
          ? `${cursor + 1}`
          : null;
      return {
        posts: posts.map((p) => convertPost(p)),
        communities: _.uniqBy(
          [
            ...communities.map(convertCommunity),
            ...posts.map((c) => convertCommunity({ community: c.community })),
            ...comments.map((c) =>
              convertCommunity({ community: c.community }),
            ),
          ],
          (c) => c.apId,
        ),
        comments: comments.map(convertComment),
        users: _.uniqBy(
          [
            ...users.map(convertPerson),
            ...posts.map((p) => convertPerson({ person: p.creator })),
            ...comments.map((p) => convertPerson({ person: p.creator })),
          ],
          (u) => u.apId,
        ),
        nextCursor,
      };
    });
  }

  async getCommunity(form: Forms.GetCommunity, options?: RequestOptions) {
    return translateErrors(async () => {
      const { community_view, moderators } = await this.client.getCommunity(
        {
          name: form.slug,
        },
        options,
      );
      return {
        community: convertCommunity(community_view),
        mods: moderators.map((m) => convertPerson({ person: m.moderator })),
      };
    });
  }

  async getCommunities(form: Forms.GetCommunities, options: RequestOptions) {
    return translateErrors(async () => {
      const { data: sort } = communitySortSchema.safeParse(form.sort);
      const { communities } = await this.client.listCommunities(
        {
          sort,
          type_: form.type,
          limit: this.limit,
          page:
            _.isUndefined(form.pageCursor) ||
            form.pageCursor === INIT_PAGE_TOKEN
              ? 1
              : _.parseInt(form.pageCursor) + 1,
        },
        options,
      );

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;
      const hasNextCursor = communities.length >= this.limit;

      return {
        communities: communities.map((communityView) =>
          convertCommunity(communityView),
        ),
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    });
  }

  async getMultiCommunityFeeds() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async followCommunity(form: Forms.FollowCommunity) {
    return translateErrors(async () => {
      const { community_view } = await this.client.followCommunity({
        community_id: form.communityId,
        follow: form.follow,
      });
      return convertCommunity(community_view);
    });
  }

  async editPost(form: Forms.EditPost) {
    return translateErrors(async () => {
      const { post_id } = await this.resolveObjectId(form.apId);

      if (_.isNil(post_id)) {
        throw new Error("post not found");
      }

      const { post_view } = await this.client.editPost({
        post_id,
        url: form.url ?? undefined,
        body: form.body ?? undefined,
        name: form.title,
        alt_text: form.altText ?? undefined,
        custom_thumbnail: form.thumbnailUrl ?? undefined,
      });

      return convertPost(post_view);
    });
  }

  async logout() {
    return translateErrors(async () => {
      const { success } = await this.client.logout();
      if (!success) {
        throw new Error("failed to logout");
      }
    });
  }

  async getComments(form: Forms.GetComments, options: RequestOptions) {
    return translateErrors(async () => {
      let post_id: number | undefined = undefined;

      if (form.postApId) {
        post_id = (await this.resolveObjectId(form.postApId)).post_id;

        if (_.isNil(post_id)) {
          throw new Error("could not find post");
        }
      }

      const { data: sort } = commentSortSchema.safeParse(form.sort);

      const comments: lemmyV3.CommentView[] = [];

      const breath = this.client.getComments(
        {
          sort,
          post_id,
          type_: "All",
          limit: this.limit,
          page:
            _.isUndefined(form.pageCursor) ||
            form.pageCursor === INIT_PAGE_TOKEN
              ? 1
              : _.parseInt(form.pageCursor) + 1,
          saved_only: form.savedOnly,
          parent_id: form.parentId,
        },
        options,
      );

      const isFirstPage =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN;
      if (form.maxDepth && isFirstPage) {
        const depth = await this.client.getComments(
          {
            sort,
            post_id,
            type_: "All",
            limit: 300,
            max_depth: form.maxDepth,
            saved_only: form.savedOnly,
            parent_id: form.parentId,
          },
          options,
        );
        comments.push(...depth.comments);
      }

      const breathComments = (await breath).comments;
      comments.push(...breathComments);

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;
      // Lemmy next cursor is broken when maxDepth is present.
      // It will page out to infinity until we get rate limited
      const hasNextCursor = breathComments.length >= this.limit;

      return {
        comments: _.uniqBy(comments, (c) => c.comment.id).map(convertComment),
        creators: comments.map(({ creator }) =>
          convertPerson({ person: creator }),
        ),
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    });
  }

  async createComment({ postApId, body, parentId }: Forms.CreateComment) {
    return translateErrors(async () => {
      const { post_id } = await this.resolveObjectId(postApId);

      if (_.isNil(post_id)) {
        throw new Error("could not find post");
      }

      const comment = await this.client.createComment({
        post_id,
        content: body,
        parent_id: parentId,
      });

      return convertComment(comment.comment_view);
    });
  }

  async likeComment({ id, score }: Forms.LikeComment) {
    return translateErrors(async () => {
      const { comment_view } = await this.client.likeComment({
        comment_id: id,
        score,
      });
      return convertComment(comment_view);
    });
  }

  async saveComment(form: Forms.SaveComment) {
    return translateErrors(async () => {
      const { comment_view } = await this.client.saveComment({
        comment_id: form.commentId,
        save: form.save,
      });
      return convertComment(comment_view);
    });
  }

  async deleteComment({ id, deleted }: Forms.DeleteComment) {
    return translateErrors(async () => {
      const { comment_view } = await this.client.deleteComment({
        comment_id: id,
        deleted,
      });
      return convertComment(comment_view);
    });
  }

  async editComment({ id, body }: Forms.EditComment) {
    return translateErrors(async () => {
      const { comment_view } = await this.client.editComment({
        comment_id: id,
        content: body,
      });
      return convertComment(comment_view);
    });
  }

  async login(form: Forms.Login): Promise<{ jwt: string }> {
    return translateErrors(async () => {
      const { jwt } = await this.client.login({
        username_or_email: form.username,
        password: form.password,
        totp_2fa_token: form.mfaCode,
      });
      if (_.isNil(jwt)) {
        throw new Error("api did not return jwt");
      }
      return { jwt };
    });
  }

  async getPrivateMessages(
    form: Forms.GetPrivateMessages,
    options: RequestOptions,
  ) {
    return translateErrors(async () => {
      const { private_messages } = await this.client.getPrivateMessages(
        {
          unread_only: form.unreadOnly,
          limit: this.limit,
          page:
            _.isUndefined(form.pageCursor) ||
            form.pageCursor === INIT_PAGE_TOKEN
              ? 1
              : _.parseInt(form.pageCursor) + 1,
        },
        options,
      );

      const profiles = _.uniqBy(
        [
          ...private_messages.map((pm) => pm.creator),
          ...private_messages.map((pm) => pm.recipient),
        ],
        (p) => p.actor_id,
      ).map((person) => convertPerson({ person }));

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;
      const hasNextCursor = private_messages.length >= this.limit;

      return {
        privateMessages: private_messages.map(convertPrivateMessage),
        profiles,
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    });
  }

  async createPrivateMessage(form: Forms.CreatePrivateMessage) {
    return translateErrors(async () => {
      const { private_message_view } = await this.client.createPrivateMessage({
        content: form.body,
        recipient_id: form.recipientId,
      });
      return convertPrivateMessage(private_message_view);
    });
  }

  async markPrivateMessageRead(form: Forms.MarkPrivateMessageRead) {
    return translateErrors(async () => {
      await this.client.markPrivateMessageAsRead({
        private_message_id: form.id,
        read: form.read,
      });
    });
  }

  async getReplies(form: Forms.GetReplies, options: RequestOptions) {
    return translateErrors(async () => {
      const { replies } = await this.client.getReplies(
        {
          unread_only: form.unreadOnly,
          limit: this.limit,
          page:
            _.isUndefined(form.pageCursor) ||
            form.pageCursor === INIT_PAGE_TOKEN
              ? 1
              : _.parseInt(form.pageCursor) + 1,
        },
        options,
      );

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;
      const hasNextCursor = replies.length >= this.limit;

      return {
        replies: replies.map(convertReply),
        comments: replies.map(convertComment),
        profiles: _.unionBy(
          replies.map((r) => convertPerson({ person: r.creator })),
          (p) => p.apId,
        ),
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    });
  }

  async getMentions(form: Forms.GetReplies, options: RequestOptions) {
    return translateErrors(async () => {
      const { mentions } = await this.client.getPersonMentions(
        {
          unread_only: form.unreadOnly,
          limit: this.limit,
          page:
            _.isUndefined(form.pageCursor) ||
            form.pageCursor === INIT_PAGE_TOKEN
              ? 1
              : _.parseInt(form.pageCursor) + 1,
        },
        options,
      );

      const nextCursor =
        _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
          ? 1
          : _.parseInt(form.pageCursor) + 1;
      const hasNextCursor = mentions.length >= this.limit;

      return {
        mentions: mentions.map(convertMention),
        comments: mentions.map(convertComment),
        profiles: _.unionBy(
          mentions.map((r) => convertPerson({ person: r.creator })),
          (p) => p.apId,
        ),
        nextCursor: hasNextCursor ? String(nextCursor) : null,
      };
    });
  }

  async markAllRead() {
    return translateErrors(async () => {
      await this.client.markAllAsRead();
    });
  }

  async markReplyRead(form: Forms.MarkReplyRead) {
    return translateErrors(async () => {
      await this.client.markCommentReplyAsRead({
        comment_reply_id: form.id,
        read: form.read,
      });
    });
  }

  async markMentionRead(form: Forms.MarkMentionRead) {
    return translateErrors(async () => {
      await this.client.markPersonMentionAsRead({
        person_mention_id: form.id,
        read: form.read,
      });
    });
  }

  async createPost(form: Forms.CreatePost) {
    return translateErrors(async () => {
      const community = await this.getCommunity({
        slug: form.communitySlug,
      });

      const { post_view } = await this.client.createPost({
        alt_text: form.altText ?? undefined,
        body: form.body ?? undefined,
        community_id: community.community.id,
        custom_thumbnail: form.thumbnailUrl ?? undefined,
        name: form.title,
        nsfw: form.nsfw ?? undefined,
        url: form.url ?? undefined,
      });

      return convertPost(post_view);
    });
  }

  async createPostReport(form: Forms.CreatePostReport) {
    return translateErrors(async () => {
      await this.client.createPostReport({
        post_id: form.postId,
        reason: form.reason,
      });
    });
  }

  async removePost(form: Forms.RemovePost) {
    return translateErrors(async () => {
      const { post_view } = await this.client.removePost({
        post_id: form.postId,
        removed: form.removed,
        reason: form.reason,
      });
      return convertPost(post_view);
    });
  }

  async lockPost(form: Forms.LockPost) {
    return translateErrors(async () => {
      const { post_view } = await this.client.lockPost({
        post_id: form.postId,
        locked: form.locked,
      });
      return convertPost(post_view);
    });
  }

  async createCommentReport(form: Forms.CreateCommentReport) {
    return translateErrors(async () => {
      await this.client.createCommentReport({
        comment_id: form.commentId,
        reason: form.reason,
      });
    });
  }

  async removeComment(form: Forms.RemoveComment) {
    return translateErrors(async () => {
      const { comment_view } = await this.client.removeComment({
        comment_id: form.commentId,
        removed: form.removed,
        reason: form.reason,
      });
      return convertComment(comment_view);
    });
  }

  async lockComment() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async markCommentAsAnswer() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async addCommentReactionEmoji() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async addPostReactionEmoji() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
  }

  async blockPerson(form: Forms.BlockPerson): Promise<void> {
    return translateErrors(async () => {
      await this.client.blockPerson({
        person_id: form.personId,
        block: form.block,
      });
    });
  }

  async blockCommunity(form: Forms.BlockCommunity): Promise<void> {
    return translateErrors(async () => {
      await this.client.blockCommunity({
        community_id: form.communityId,
        block: form.block,
      });
    });
  }

  async markPostRead(form: Forms.MarkPostRead) {
    return translateErrors(async () => {
      await this.client.markPostAsRead({
        post_ids: form.postIds,
        read: form.read,
      });
    });
  }

  async uploadImage(form: Forms.UploadImage) {
    return translateErrors(async () => {
      const res = await this.client.uploadImage(form);
      const fileId = res.files?.[0]?.file;
      if (!fileId && res.msg !== "ok") {
        throw new Error(res.msg);
      }
      if (!res.url && fileId) {
        res.url = `${this.instance}/pictrs/image/${fileId}`;
      }
      return { url: res.url };
    });
  }

  async getCaptcha(options: RequestOptions) {
    return translateErrors(async () => {
      const { ok } = await this.client.getCaptcha(options);
      if (!ok) {
        throw new Error("couldn't get captcha");
      }
      return {
        uuid: ok.uuid,
        audioUrl: ok.wav,
        imgUrl: ok.png,
      };
    });
  }

  async register(form: Forms.Register) {
    return translateErrors(async () => {
      const { jwt, registration_created, verify_email_sent } =
        await this.client.register({
          username: form.username,
          password: form.password,
          password_verify: form.repeatPassword,
          show_nsfw: form.showNsfw,
          email: form.email,
          captcha_uuid: form.captchaUuid,
          captcha_answer: form.captchaAnswer,
          answer: form.answer,
        });
      return {
        jwt: jwt ?? null,
        registrationCreated: registration_created,
        verifyEmailSent: verify_email_sent,
      };
    });
  }

  async saveUserSettings(form: Forms.SaveUserSettings) {
    return translateErrors(async () => {
      let avatar: string | undefined = undefined;
      let banner: string | undefined = undefined;

      if (form.avatar) {
        avatar = (await this.uploadImage({ image: form.avatar })).url;
      }

      if (form.banner) {
        banner = (await this.uploadImage({ image: form.banner })).url;
      }

      await this.client.saveUserSettings({
        avatar,
        banner,
        bio: form.bio,
        display_name: form.displayName,
        email: form.email,
      });
    });
  }

  async removeUserAvatar() {
    return translateErrors(async () => {
      await this.client.saveUserSettings({
        avatar: "",
      });
    });
  }

  async getPostReports(form: Forms.GetPostReports, options: RequestOptions) {
    return translateErrors(async () => {
      const cursor = cursorToInt(form.pageCursor) ?? 1;
      const { post_reports } = await this.client.listPostReports(
        {
          page: cursor,
          unresolved_only: form.unresolvedOnly,
          limit: this.limit,
        },
        options,
      );
      const postReports = post_reports.map(convertPostReport);
      const hasMore = post_reports.length >= this.limit;
      return {
        postReports,
        users: _.compact(
          post_reports.flatMap(({ creator, resolver }) => [
            convertPerson({ person: creator }),
            resolver ? convertPerson({ person: resolver }) : null,
          ]),
        ),
        posts: post_reports.flatMap((report) =>
          convertPost({
            ...report,
            creator: report.post_creator,
            // If you're the mod you're probably not banned
            banned_from_community: false,
          }),
        ),
        communities: post_reports.map((report) =>
          convertCommunity({ community: report.community }),
        ),
        nextCursor: hasMore ? String(cursor) : null,
      };
    });
  }

  async getCommentReports(
    form: Forms.GetCommentReports,
    options: RequestOptions,
  ) {
    return translateErrors(async () => {
      const cursor = cursorToInt(form.pageCursor) ?? 1;
      const { comment_reports } = await this.client.listCommentReports(
        {
          page: cursor,
          unresolved_only: form.unresolvedOnly,
          limit: this.limit,
        },
        options,
      );
      const commentReports = comment_reports.map(convertCommentReport);
      const hasMore = comment_reports.length >= this.limit;
      return {
        commentReports,
        users: _.compact(
          comment_reports.flatMap(({ creator, resolver }) => [
            convertPerson({ person: creator }),
            resolver ? convertPerson({ person: resolver }) : null,
          ]),
        ),
        comments: comment_reports.flatMap((report) =>
          convertComment({
            ...report,
            creator: report.comment_creator,
            // If you're the mod you're probably not banned
            banned_from_community: false,
          }),
        ),
        communities: comment_reports.map((report) =>
          convertCommunity({ community: report.community }),
        ),
        nextCursor: hasMore ? String(cursor) : null,
      };
    });
  }

  async resolvePostReport(form: Forms.ResolvePostReport) {
    return translateErrors(async () => {
      const { post_report_view } = await this.client.resolvePostReport({
        report_id: form.reportId,
        resolved: form.resolved,
      });
      return convertPostReport(post_report_view);
    });
  }

  async resolveCommentReport(form: Forms.ResolveCommentReport) {
    return translateErrors(async () => {
      const { comment_report_view } = await this.client.resolveCommentReport({
        report_id: form.reportId,
        resolved: form.resolved,
      });
      return convertCommentReport(comment_report_view);
    });
  }

  async resolveObject(form: Forms.ResolveObject, options: RequestOptions) {
    return translateErrors(async () => {
      const { post, community, person, comment } =
        await this.client.resolveObject(
          {
            q: form.q,
          },
          options,
        );
      return resolveObjectResponseSchema.parse({
        post: post ? convertPost(post) : null,
        community: community ? convertCommunity(community) : null,
        user: person ? convertPerson(person) : null,
        comment: comment ? convertComment(comment) : null,
      });
    });
  }

  async getLinkMetadata(form: Forms.GetLinkMetadata) {
    return translateErrors(async () => {
      const { metadata } = await this.client.getSiteMetadata({
        url: form.url,
      });

      return {
        title: metadata.title,
        description: metadata.description,
        contentType: metadata.content_type,
        imageUrl: metadata.image,
        embedVideoUrl: metadata.embed_video_url,
      };
    });
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
