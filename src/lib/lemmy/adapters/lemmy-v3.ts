import { env } from "@/src/env";
import * as lemmyV3 from "lemmy-v3";
import {
  ApiBlueprint,
  Schemas,
  RequestOptions,
  Forms,
  INIT_PAGE_TOKEN,
  Errors,
  slugSchema,
} from "./api-blueprint";
import { createSlug } from "../utils";
import _ from "lodash";
import z from "zod";

function is2faError(err?: Error | null) {
  return err && err.message.includes("missing_totp_token");
}

const POST_SORTS: lemmyV3.PostSortType[] = [
  "Active",
  "Hot",
  "New",
  "Old",
  "TopAll",
  "TopDay",
  "TopHour",
  "TopSixHour",
  "TopTwelveHour",
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
const postSortSchema = z.custom<lemmyV3.PostSortType>((sort) => {
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

const COMMUNITY_SORTS: lemmyV3.CommunitySortType[] = [
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
  "NameAsc",
  "NameDesc",
] as const;
const communitySortSchema = z.custom<lemmyV3.CommunitySortType>((sort) => {
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
          commentCount: counts.posts,
          subscriberCount: counts.subscribers,
          subscribersLocalCount: counts.subscribers_local,
        }
      : {}),
    ...(subscribed
      ? {
          subscribed:
            subscribed === "ApprovalRequired" ? "Pending" : subscribed,
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
    postCount: counts?.post_count ?? null,
    commentCount: counts?.comment_count ?? null,
  };
}

function convertPost(postView: lemmyV3.PostView): Schemas.Post {
  const { post, counts, community, creator } = postView;
  return {
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
    url: post.url ?? null,
    urlContentType: post.url_content_type ?? null,
    creatorId: post.creator_id,
    createdAt: post.published,
    id: post.id,
    apId: post.ap_id,
    title: post.name,
    body: post.body ?? null,
    thumbnailUrl: post.thumbnail_url ?? null,
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
    crossPosts: [],
    featuredCommunity: post.featured_community,
    featuredLocal: post.featured_local,
    read: postView.read,
    saved: postView.saved,
    nsfw: post.nsfw,
  };
}
function convertComment(commentView: lemmyV3.CommentView): Schemas.Comment {
  const { post, counts, creator, comment, community } = commentView;
  return {
    createdAt: comment.published,
    id: comment.id,
    apId: comment.ap_id,
    body: comment.content,
    creatorId: creator.id,
    creatorApId: creator.actor_id,
    creatorSlug: createSlug({ apId: creator.actor_id, name: creator.name })
      .slug,
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
  };
}

function convertMention(replyView: lemmyV3.PersonMentionView): Schemas.Reply {
  const { creator, community } = replyView;
  return {
    createdAt: replyView.person_mention.published,
    id: replyView.person_mention.id,
    commentId: replyView.comment.id,
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
  };
}

export class LemmyV3Api implements ApiBlueprint<lemmyV3.LemmyHttp> {
  client: lemmyV3.LemmyHttp;
  instance: string;
  limit = 50;

  private resolveObjectId = _.memoize(
    async (apId: string) => {
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
    },
    (apId) => apId,
  );

  constructor({ instance, jwt }: { instance: string; jwt?: string }) {
    this.instance = instance;
    this.client = new lemmyV3.LemmyHttp(instance.replace(/\/$/, ""), {
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
    const site = await this.client.getSite(options);
    const me = site.my_user?.local_user_view.person;
    return {
      instance: this.instance,
      admins: site.admins.map((p) => convertPerson(p)),
      me: me ? convertPerson({ person: me }) : null,
      version: site.version,
      usersActiveDayCount: site.site_view.counts.users_active_day,
      usersActiveWeekCount: site.site_view.counts.users_active_week,
      usersActiveMonthCount: site.site_view.counts.users_active_month,
      usersActiveHalfYearCount: site.site_view.counts.users_active_half_year,
      postCount: site.site_view.counts.posts,
      commentCount: site.site_view.counts.comments,
      userCount: site.site_view.counts.users,
      sidebar: site.site_view.site.sidebar ?? null,
      icon: site.site_view.site.icon ?? null,
      title: site.site_view.site.name,
      moderates:
        site.my_user?.moderates.map(({ community }) =>
          convertCommunity({ community }),
        ) ?? null,
      follows:
        site.my_user?.follows.map(({ community }) =>
          convertCommunity({ community }),
        ) ?? null,
      personBlocks:
        site.my_user?.person_blocks.map((block) =>
          // @ts-expect-error
          convertPerson({ person: block.target }),
        ) ?? null,
      communityBlocks:
        site.my_user?.community_blocks.map((community) =>
          convertCommunity({ community }),
        ) ?? null,
      applicationQuestion:
        site.site_view.local_site.application_question ?? null,
    };
  }

  async getPost(form: { apId: string }, options: RequestOptions) {
    const { post_id } = await this.resolveObjectId(form.apId);
    if (_.isNil(post_id)) {
      throw new Error("post not found");
    }
    const fullPost = await this.client.getPost(
      {
        id: post_id,
      },
      options,
    );
    return {
      post: convertPost(fullPost.post_view),
      creator: convertPerson({ person: fullPost.post_view.creator }),
    };
  }

  async getPosts(form: Forms.GetPosts, options: RequestOptions) {
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
        /* community:  */
      })),
    };
  }

  async savePost(form: Forms.SavePost) {
    const { post_view } = await this.client.savePost({
      post_id: form.postId,
      save: form.save,
    });
    return convertPost(post_view);
  }

  async likePost(form: Forms.LikePost) {
    const { post_view } = await this.client.likePost({
      post_id: form.postId,
      score: form.score,
    });
    return convertPost(post_view);
  }

  async deletePost(form: Forms.DeletePost) {
    const { post_view } = await this.client.deletePost({
      post_id: form.postId,
      deleted: form.deleted,
    });
    return convertPost(post_view);
  }

  async featurePost(form: Forms.FeaturePost) {
    const { post_view } = await this.client.featurePost({
      post_id: form.postId,
      featured: form.featured,
      feature_type: form.featureType,
    });
    return convertPost(post_view);
  }

  async getPerson(form: Forms.GetPerson, options: RequestOptions) {
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

    const { posts, comments } = await this.client.getPersonDetails(
      {
        ...personOrUsername,
        limit: this.limit,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
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
      posts: posts.map(convertPost),
      comments: comments.map(convertComment),
      nextCursor: hasNextCursor ? String(nextCursor) : null,
    };
  }

  async search(form: Forms.Search, options: RequestOptions) {
    const cursor = cursorToInt(form.pageCursor) ?? 1;
    const { posts, communities, users } = await this.client.search(
      {
        q: form.q,
        page: cursor,
      },
      options,
    );
    const hasMorePosts = posts.length > this.limit;
    const hasMoreCommunities = communities.length > this.limit;
    const hasMoreUsers = users.length > this.limit;
    const nextCursor =
      hasMorePosts || hasMoreCommunities || hasMoreUsers
        ? `${cursor + 1}`
        : null;
    return {
      posts: posts.map(convertPost),
      communities: communities.map(convertCommunity),
      users: users.map(convertPerson),
      nextCursor,
    };
  }

  async getCommunity(form: Forms.GetCommunity, options?: RequestOptions) {
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
  }

  async getCommunities(form: Forms.GetCommunities, options: RequestOptions) {
    const { data: sort } = communitySortSchema.safeParse(form.sort);
    const { communities } = await this.client.listCommunities(
      {
        sort,
        type_: form.type,
        limit: this.limit,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
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
  }

  async followCommunity(form: Forms.FollowCommunity) {
    const { community_view } = await this.client.followCommunity({
      community_id: form.communityId,
      follow: form.follow,
    });
    return convertCommunity(community_view);
  }

  async editPost(form: Forms.EditPost) {
    const { post_id } = await this.resolveObjectId(form.apId);

    if (_.isNil(post_id)) {
      throw new Error("post not found");
    }

    const { post_view } = await this.client.editPost({
      post_id,
      url: form.url ?? undefined,
      body: form.body ?? undefined,
      name: form.title,
      alt_text: form.altText,
      custom_thumbnail: form.thumbnailUrl ?? undefined,
    });

    return convertPost(post_view);
  }

  async logout() {
    const { success } = await this.client.logout();
    if (!success) {
      throw new Error("failed to logout");
    }
  }

  async getComments(form: Forms.GetComments, options: RequestOptions) {
    if (!form.postApId) {
      throw new Error("postApId required");
    }

    const { post_id } = await this.resolveObjectId(form.postApId);

    if (_.isNil(post_id)) {
      throw new Error("could not find post");
    }

    const { data: sort } = commentSortSchema.safeParse(form.sort);

    const { comments } = await this.client.getComments(
      {
        sort,
        post_id,
        type_: "All",
        limit: this.limit,
        max_depth: 6,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
            ? 1
            : _.parseInt(form.pageCursor) + 1,
        saved_only: form.savedOnly,
      },
      options,
    );

    const nextCursor =
      _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
        ? 1
        : _.parseInt(form.pageCursor) + 1;
    const hasNextCursor = comments.length >= this.limit;

    return {
      comments: comments.map(convertComment),
      creators: comments.map(({ creator }) =>
        convertPerson({ person: creator }),
      ),
      nextCursor: hasNextCursor ? String(nextCursor) : null,
    };
  }

  async createComment({ postApId, body, parentId }: Forms.CreateComment) {
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
  }

  async likeComment({ id, score }: Forms.LikeComment) {
    const { comment_view } = await this.client.likeComment({
      comment_id: id,
      score,
    });
    return convertComment(comment_view);
  }

  async deleteComment({ id, deleted }: Forms.DeleteComment) {
    const { comment_view } = await this.client.deleteComment({
      comment_id: id,
      deleted,
    });
    return convertComment(comment_view);
  }

  async editComment({ id, body }: Forms.EditComment) {
    const { comment_view } = await this.client.editComment({
      comment_id: id,
      content: body,
    });
    return convertComment(comment_view);
  }

  async login(form: Forms.Login): Promise<{ jwt: string }> {
    try {
      const { jwt } = await this.client.login({
        username_or_email: form.username,
        password: form.password,
        totp_2fa_token: form.mfaCode,
      });
      if (_.isNil(jwt)) {
        throw new Error("api did not return jwt");
      }
      return { jwt };
    } catch (err) {
      if (_.isError(err) && is2faError(err)) {
        throw Errors.MFA_REQUIRED;
      }
      throw err;
    }
  }

  async getPrivateMessages(
    form: Forms.GetPrivateMessages,
    options: RequestOptions,
  ) {
    const { private_messages } = await this.client.getPrivateMessages(
      {
        unread_only: form.unreadOnly,
        limit: this.limit,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
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
  }

  async createPrivateMessage(form: Forms.CreatePrivateMessage) {
    const { private_message_view } = await this.client.createPrivateMessage({
      content: form.body,
      recipient_id: form.recipientId,
    });
    return convertPrivateMessage(private_message_view);
  }

  async markPrivateMessageRead(form: Forms.MarkPrivateMessageRead) {
    await this.client.markPrivateMessageAsRead({
      private_message_id: form.id,
      read: form.read,
    });
  }

  async getReplies(form: Forms.GetReplies, options: RequestOptions) {
    const { replies } = await this.client.getReplies(
      {
        unread_only: form.unreadOnly,
        limit: this.limit,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
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
      profiles: _.unionBy(
        replies.map((r) => convertPerson({ person: r.creator })),
        (p) => p.apId,
      ),
      nextCursor: hasNextCursor ? String(nextCursor) : null,
    };
  }

  async getMentions(form: Forms.GetReplies, options: RequestOptions) {
    const { mentions } = await this.client.getPersonMentions(
      {
        unread_only: form.unreadOnly,
        limit: this.limit,
        page:
          _.isUndefined(form.pageCursor) || form.pageCursor === INIT_PAGE_TOKEN
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
      profiles: _.unionBy(
        mentions.map((r) => convertPerson({ person: r.creator })),
        (p) => p.apId,
      ),
      nextCursor: hasNextCursor ? String(nextCursor) : null,
    };
  }

  async markReplyRead(form: Forms.MarkReplyRead) {
    await this.client.markCommentReplyAsRead({
      comment_reply_id: form.id,
      read: form.read,
    });
  }

  async markMentionRead(form: Forms.MarkMentionRead) {
    await this.client.markPersonMentionAsRead({
      person_mention_id: form.id,
      read: form.read,
    });
  }

  async createPost(form: Forms.CreatePost) {
    const community = await this.getCommunity({
      slug: form.communitySlug,
    });

    const { post_view } = await this.client.createPost({
      alt_text: form.altText,
      body: form.body ?? undefined,
      community_id: community.community.id,
      custom_thumbnail: form.thumbnailUrl ?? undefined,
      name: form.title,
      nsfw: form.nsfw ?? undefined,
      url: form.url ?? undefined,
    });

    return convertPost(post_view);
  }

  async createPostReport(form: Forms.CreatePostReport) {
    await this.client.createPostReport({
      post_id: form.postId,
      reason: form.reason,
    });
  }

  async createCommentReport(form: Forms.CreateCommentReport) {
    await this.client.createCommentReport({
      comment_id: form.commentId,
      reason: form.reason,
    });
  }

  async blockPerson(form: Forms.BlockPerson): Promise<void> {
    await this.client.blockPerson({
      person_id: form.personId,
      block: form.block,
    });
  }

  async blockCommunity(form: Forms.BlockCommunity): Promise<void> {
    await this.client.blockCommunity({
      community_id: form.communityId,
      block: form.block,
    });
  }

  async markPostRead(form: Forms.MarkPostRead) {
    await this.client.markPostAsRead({
      post_ids: form.postIds,
      read: form.read,
    });
  }

  async uploadImage(form: Forms.UploadImage) {
    const res = await this.client.uploadImage(form);
    const fileId = res.files?.[0]?.file;
    if (!res.url && fileId) {
      res.url = `${this.instance}/pictrs/image/${fileId}`;
    }
    return { url: res.url };
  }

  async getCaptcha(options: RequestOptions) {
    const { ok } = await this.client.getCaptcha(options);
    if (!ok) {
      throw new Error("couldn't get captcha");
    }
    return {
      uuid: ok.uuid,
      audioUrl: ok.wav,
      imgUrl: ok.png,
    };
  }

  async register(form: Forms.Register) {
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
