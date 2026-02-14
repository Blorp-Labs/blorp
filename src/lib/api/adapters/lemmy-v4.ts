import { env } from "@/src/env";
import * as lemmyV4 from "lemmy-v4";
import * as lemmyV3 from "lemmy-v3";
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
import { createSlug } from "../utils";
import _ from "lodash";
import { isErrorLike } from "../../utils";
import { getIdFromLocalApId } from "./lemmy-common";

function remapEnum<Value extends PropertyKey, Output>(
  value: Value,
  newEnum: Record<Value, Output>,
) {
  return newEnum[value as never] as Output;
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

type PostSort = (typeof POST_SORTS)[number];

function mapPostSort(sort?: string) {
  if (!sort) {
    return { sort: undefined, timeRangeSeconds: undefined };
  }

  const apiSort: lemmyV4.PostSortType = remapEnum<string, lemmyV4.PostSortType>(
    sort,
    {
      Active: "active",
      Hot: "hot",
      New: "new",
      Old: "old",
      TopAll: "top",
      TopHour: "top",
      TopSixHour: "top",
      TopTwelveHour: "top",
      TopDay: "top",
      TopWeek: "top",
      TopMonth: "top",
      TopThreeMonths: "top",
      TopSixMonths: "top",
      TopNineMonths: "top",
      TopYear: "top",
      MostComments: "most_comments",
      NewComments: "new_comments",
      Controversial: "controversial",
      Scaled: "scaled",
    } satisfies Record<PostSort, lemmyV4.PostSortType>,
  );

  let timeRangeSeconds: number | undefined = undefined;

  const SEC = 1;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY; // Approximate month
  const YEAR = 365 * DAY;
  switch (sort as lemmyV3.SortType) {
    case "TopHour":
      timeRangeSeconds = HOUR;
      break;
    case "TopSixHour":
      timeRangeSeconds = 6 * HOUR;
      break;
    case "TopTwelveHour":
      timeRangeSeconds = 12 * HOUR;
      break;
    case "TopDay":
      timeRangeSeconds = DAY;
      break;
    case "TopWeek":
      timeRangeSeconds = WEEK;
      break;
    case "TopMonth":
      timeRangeSeconds = MONTH;
      break;
    case "TopThreeMonths":
      timeRangeSeconds = 3 * MONTH;
      break;
    case "TopSixMonths":
      timeRangeSeconds = 6 * MONTH;
      break;
    case "TopNineMonths":
      timeRangeSeconds = 9 * MONTH;
      break;
    case "TopYear":
      timeRangeSeconds = YEAR;
      break;
    case "TopAll":
      timeRangeSeconds = undefined;
  }

  return { sort: apiSort, timeRangeSeconds };
}

function mapCommunitySort(sort?: string) {
  if (!sort) {
    return { sort: undefined, timeRangeSeconds: undefined };
  }

  const apiSort: lemmyV4.CommunitySortType = remapEnum<
    string,
    lemmyV4.CommunitySortType
  >(sort, {
    ActiveSixMonths: "active_six_months",
    ActiveMonthly: "active_monthly",
    ActiveWeekly: "active_weekly",
    ActiveDaily: "active_daily",
    Hot: "hot",
    New: "new",
    Old: "old",
    NameAsc: "name_asc",
    NameDesc: "name_desc",
    MostComments: "comments",
    MostPosts: "posts",
    TopAll: "subscribers",
    TopHour: "subscribers",
    TopSixHour: "subscribers",
    TopTwelveHour: "subscribers",
    TopDay: "subscribers",
    TopWeek: "subscribers",
    TopMonth: "subscribers",
    TopThreeMonths: "subscribers",
    TopSixMonths: "subscribers",
    TopNineMonths: "subscribers",
    TopYear: "subscribers",
  } satisfies Record<CommunitySort, lemmyV4.CommunitySortType>);

  let timeRangeSeconds: number | undefined = undefined;

  const SEC = 1;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY; // Approximate month
  const YEAR = 365 * DAY;
  switch (sort as lemmyV3.SortType) {
    case "TopHour":
      timeRangeSeconds = HOUR;
      break;
    case "TopSixHour":
      timeRangeSeconds = 6 * HOUR;
      break;
    case "TopTwelveHour":
      timeRangeSeconds = 12 * HOUR;
      break;
    case "TopDay":
      timeRangeSeconds = DAY;
      break;
    case "TopWeek":
      timeRangeSeconds = WEEK;
      break;
    case "TopMonth":
      timeRangeSeconds = MONTH;
      break;
    case "TopThreeMonths":
      timeRangeSeconds = 3 * MONTH;
      break;
    case "TopSixMonths":
      timeRangeSeconds = 6 * MONTH;
      break;
    case "TopNineMonths":
      timeRangeSeconds = 9 * MONTH;
      break;
    case "TopYear":
      timeRangeSeconds = YEAR;
      break;
    case "TopAll":
      timeRangeSeconds = undefined;
  }

  return { sort: apiSort, timeRangeSeconds };
}

const COMMENT_SORTS: lemmyV3.CommentSortType[] = [
  "Hot",
  "Top",
  "New",
  "Old",
  "Controversial",
];

type CommentSort = (typeof COMMENT_SORTS)[number];

function mapCommentSort(sort?: string) {
  if (!sort) {
    return undefined;
  }
  return remapEnum<string, lemmyV4.CommentSortType>(sort, {
    Hot: "hot",
    Top: "top",
    New: "new",
    Old: "old",
    Controversial: "controversial",
  } satisfies Record<CommentSort, lemmyV4.CommentSortType>);
}

const COMMUNITY_SORTS = [
  "ActiveSixMonths",
  "ActiveMonthly",
  "ActiveWeekly",
  "ActiveDaily",
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
  "MostPosts",
  "NameAsc",
  "NameDesc",
] as const;
type CommunitySort = (typeof COMMUNITY_SORTS)[number];

function is2faError(err?: Error | null) {
  return err && err.message.includes("missing_totp_token");
}

const DEFAULT_HEADERS = {
  // lemmy.ml will reject requests if
  // User-Agent header is not present
  "User-Agent": env.REACT_APP_NAME.toLowerCase(),
};

function convertCommunity(
  communityView: Pick<lemmyV4.CommunityView, "community" | "community_actions">,
): Schemas.Community {
  const { community } = communityView;
  return {
    createdAt: community.published_at,
    id: community.id,
    apId: community.ap_id,
    slug: createSlug({ apId: community.ap_id, name: community.name }).slug,
    icon: community.icon ?? null,
    banner: community.banner ?? null,
    description: community.description ?? null,
    usersActiveDayCount: community.users_active_day,
    usersActiveWeekCount: community.users_active_week,
    usersActiveMonthCount: community.users_active_month,
    usersActiveHalfYearCount: community.users_active_half_year,
    postCount: community.posts,
    commentCount: community.comments,
    subscriberCount: community.subscribers,
    subscribersLocalCount: community.subscribers_local,
    subscribed: (() => {
      switch (communityView.community_actions?.follow_state) {
        case "pending":
        case "approval_required":
          return "Pending";
        case "accepted":
          return "Subscribed";
      }
      return "NotSubscribed";
    })(),
  };
}

function convertPerson({
  person,
}: lemmyV4.PersonView | { person: lemmyV4.Person }): Schemas.Person {
  return {
    id: person.id,
    apId: person.ap_id,
    avatar: person.avatar ?? null,
    bio: person.bio ?? null,
    matrixUserId: person.matrix_user_id ?? null,
    slug: createSlug({ apId: person.ap_id, name: person.name }).slug,
    deleted: person.deleted,
    createdAt: person.published_at,
    isBot: person.bot_account,
    isBanned: false,
    postCount: person.post_count ?? null,
    commentCount: person?.comment_count ?? null,
  };
}

function convertPost({
  post,
  community,
  creator,
  post_actions,
  image_details,
  creator_banned_from_community,
}: Pick<
  lemmyV4.PostView,
  | "post"
  | "community"
  | "creator"
  | "post_actions"
  | "image_details"
  | "creator_banned_from_community"
>): Schemas.Post {
  const ar = image_details ? image_details.width / image_details.height : null;
  return {
    locked: post.locked,
    id: post.id,
    createdAt: post.published_at,
    apId: post.ap_id,
    title: post.name,
    body: post.body ?? null,
    thumbnailUrl: post.thumbnail_url ?? null,
    embedVideoUrl: post.embed_video_url ?? null,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    commentsCount: post.comments,
    deleted: post.deleted,
    removed: post.removed,
    communityApId: community.ap_id,
    communitySlug: createSlug({ apId: community.ap_id, name: community.name })
      .slug,
    creatorId: creator.id,
    creatorApId: creator.ap_id,
    creatorSlug: createSlug({ apId: creator.ap_id, name: creator.name }).slug,
    isBannedFromCommunity: creator_banned_from_community,
    thumbnailAspectRatio: ar,
    url: post.url ?? null,
    urlContentType: post.url_content_type ?? null,
    crossPosts: [],
    featuredCommunity: post.featured_community,
    featuredLocal: post.featured_local,
    read: !!post_actions?.read_at,
    saved: !!post_actions?.saved_at,
    nsfw: post.nsfw || community.nsfw,
    altText: post.alt_text ?? null,
    flairs: [],
    myVote: post_actions ? (post_actions.vote_is_upvote ? 1 : -1) : undefined,
  };
}
function convertComment(
  commentView: Omit<lemmyV4.CommentView, "post_tags" | "can_mod">,
): Schemas.Comment {
  const { post, creator, comment, community, comment_actions } = commentView;
  const myVote = comment_actions
    ? comment_actions.vote_is_upvote
      ? 1
      : -1
    : null;
  return {
    locked: comment.locked,
    createdAt: comment.published_at,
    id: comment.id,
    apId: comment.ap_id,
    body: comment.content,
    creatorId: creator.id,
    creatorApId: creator.ap_id,
    creatorSlug: createSlug({ apId: creator.ap_id, name: creator.name }).slug,
    isBannedFromCommunity: commentView.creator_banned_from_community,
    path: comment.path,
    downvotes: comment.downvotes,
    upvotes: comment.upvotes,
    postId: post.id,
    postApId: post.ap_id,
    removed: comment.removed,
    deleted: comment.deleted,
    communitySlug: createSlug({ apId: community.ap_id, name: community.name })
      .slug,
    communityApId: community.ap_id,
    postTitle: post.name,
    myVote,
    childCount: comment.child_count,
    saved: false,
  };
}

function convertPrivateMessage(
  pmView: lemmyV4.PrivateMessageView,
  notification?: lemmyV4.Notification,
): Schemas.PrivateMessage {
  const { creator, recipient } = pmView;
  return {
    createdAt: pmView.private_message.published_at,
    id: notification?.id ?? -1,
    creatorApId: creator.ap_id,
    creatorId: creator.id,
    creatorSlug: createSlug({ apId: creator.ap_id, name: creator.name }).slug,
    recipientApId: recipient.ap_id,
    recipientId: recipient.id,
    recipientSlug: createSlug({
      apId: recipient.ap_id,
      name: recipient.name,
    }).slug,
    body: pmView.private_message.content,
    read: notification?.read ?? false,
  };
}

function convertMentionReply(
  replyView: lemmyV4.NotificationView,
): Schemas.Reply {
  const { data, notification } = replyView;
  if (data.type_ !== "comment") {
    throw new Error("this shouldn't happend");
  }
  const { community, comment, creator, post } = data;
  return {
    createdAt: notification.published_at,
    id: notification.id,
    commentId: comment.id,
    commentApId: comment.ap_id,
    communityApId: community.ap_id,
    communitySlug: createSlug({
      apId: community.ap_id,
      name: community.name,
    }).slug,
    body: comment.content,
    path: comment.path,
    creatorId: creator.id,
    creatorApId: creator.ap_id,
    creatorSlug: createSlug({ apId: creator.ap_id, name: creator.name }).slug,
    read: notification.read,
    postId: post.id,
    postApId: post.ap_id,
    postName: post.name,
    deleted: comment.deleted,
    removed: comment.removed,
  };
}

function convertPostReport(report: lemmyV4.PostReportView) {
  return {
    resolved: report.post_report.resolved,
    createdAt: report.post_report.published_at,
    id: report.post_report.id,
    postId: report.post.id,
    postApId: report.post.ap_id,
    creatorId: report.creator.id,
    creatorApId: report.creator.ap_id,
    creatorSlug: createSlug({
      apId: report.creator.ap_id,
      name: report.creator.name,
    }).slug,
    resolverId: report.resolver?.id ?? null,
    resolverApId: report.resolver?.ap_id ?? null,
    resolverSlug: report.resolver
      ? createSlug({
          apId: report.resolver.ap_id,
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
  report: lemmyV4.CommentReportView,
): Schemas.CommentReport {
  return {
    resolved: report.comment_report.resolved,
    createdAt: report.comment_report.published_at,
    id: report.comment_report.id,
    commentId: report.comment.id,
    commentApId: report.comment.ap_id,
    commentPath: report.comment.path,
    creatorId: report.creator.id,
    creatorApId: report.creator.ap_id,
    creatorSlug: createSlug({
      apId: report.creator.ap_id,
      name: report.creator.name,
    }).slug,
    resolverId: report.resolver?.id ?? null,
    resolverApId: report.resolver?.ap_id ?? null,
    resolverSlug: report.resolver
      ? createSlug({
          apId: report.resolver.ap_id,
          name: report.resolver.name,
        }).slug
      : null,
    reason: report.comment_report.reason,
  };
}

function convertFeed(
  multiCommunity: lemmyV4.MultiCommunityView,
): Schemas.MultiCommunityFeed {
  const { multi } = multiCommunity;
  return {
    id: multi.id,
    apId: multi.ap_id,
    createdAt: multi.published_at,
    name: multi.name,
    slug: createSlug({
      name: multi.name,
      apId: multi.ap_id,
    }).slug,
    icon: null,
    description: multi.description ?? null,
    banner: null,
    subscriberCount: multi.subscribers,
    communityCount: multi.communities,
    nsfw: false,
    communitySlugs: [],
  };
}

export class LemmyV4Api implements ApiBlueprint<lemmyV4.LemmyHttp> {
  software = Software.LEMMY;
  softwareVersion: string;

  client: lemmyV4.LemmyHttp;
  isLoggedIn = false;
  instance: string;
  limit = 50;

  private resolveObjectId = _.memoize(
    async (apId: string) => {
      // This shortcut only works for local objects
      if (apId.startsWith(this.instance)) {
        const local = getIdFromLocalApId(apId);
        if (local) {
          return local;
        }
      }
      const { resolve } = await this.client.resolveObject({
        q: apId,
      });
      const post = resolve?.type_ === "post" ? resolve : undefined;
      const community = resolve?.type_ === "community" ? resolve : undefined;
      const person = resolve?.type_ === "person" ? resolve : undefined;
      const comment = resolve?.type_ === "comment" ? resolve : undefined;
      const multiCommunity =
        resolve?.type_ === "multi_community" ? resolve : undefined;
      return {
        post_id: post?.post.id,
        comment_id: comment?.comment.id,
        community_id: community?.community.id,
        person_id: person?.person.id,
        multi_community_id: multiCommunity?.multi.id,
      };
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
    this.instance = instance;
    this.client = new lemmyV4.LemmyHttp(instance.replace(/\/$/, ""), {
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
      this.isLoggedIn = true;
    }
  }

  async getSite(options: RequestOptions) {
    const [lemmySite, myUser] = await Promise.all([
      this.client.getSite(options),
      this.isLoggedIn ? this.client.getMyUser(options) : null,
    ]);
    const enableDownvotes =
      "enable_downvotes" in lemmySite.site_view.local_site &&
      lemmySite.site_view.local_site.enable_downvotes === true;

    const me = myUser ? convertPerson(myUser.local_user_view) : null;

    const admins = lemmySite.admins.map((p) => convertPerson(p));
    const site = {
      privateInstance: lemmySite.site_view.local_site.private_instance,
      description: lemmySite.site_view.site.description ?? null,
      instance: this.instance,
      admins: admins.map((a) => a.apId),
      myEmail: null,
      version: lemmySite.version,
      me,
      moderates: [],
      follows: [],
      communityBlocks: [],
      personBlocks: [],
      usersActiveDayCount: lemmySite.site_view.local_site.users_active_day,
      usersActiveWeekCount: lemmySite.site_view.local_site.users_active_week,
      usersActiveMonthCount: lemmySite.site_view.local_site.users_active_month,
      usersActiveHalfYearCount:
        lemmySite.site_view.local_site.users_active_half_year,
      postCount: lemmySite.site_view.local_site.posts,
      commentCount: lemmySite.site_view.local_site.comments,
      userCount: lemmySite.site_view.local_site.users,
      sidebar: lemmySite.site_view.site.sidebar ?? null,
      icon: lemmySite.site_view.site.icon ?? null,
      title: lemmySite.site_view.site.name,
      applicationQuestion:
        lemmySite.site_view.local_site.application_question ?? null,
      registrationMode: remapEnum(
        lemmySite.site_view.local_site.registration_mode,
        {
          closed: "Closed",
          require_application: "RequireApplication",
          open: "Open",
        } as const,
      ),
      showNsfw: false,
      blurNsfw: true,
      enablePostDownvotes: enableDownvotes,
      enableCommentDownvotes: enableDownvotes,
      software: this.software,
    };

    return {
      site,
      profiles: _.compact([...admins, me]),
    };
  }

  async getPost(form: { apId: string }, options: RequestOptions) {
    const { post_id } = await this.resolveObjectId(form.apId);
    console.log("HERE", post_id);
    if (_.isNil(post_id)) {
      throw new Error("post not found");
    }
    console.log("THERE", post_id);
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

  async votePostPoll() {
    throw Errors.NOT_IMPLEMENTED;
    return {} as any;
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
      is_upvote: form.score === 0 ? undefined : form.score === 1,
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
      feature_type: remapEnum(form.featureType, {
        Local: "local",
        Community: "community",
      }),
      featured: form.featured,
    });
    return convertPost(post_view);
  }

  async getPerson(form: Forms.GetPerson, options: RequestOptions) {
    // @ts-expect-error
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
  }

  async getPersonContent(
    form: Forms.GetPersonContent,
    options: RequestOptions,
  ) {
    const { person_id } = await this.resolveObjectId(form.apIdOrUsername);

    if (_.isNil(person_id)) {
      throw new Error("person not found");
    }

    const content = await this.client.listPersonContent(
      {
        person_id,
        limit: this.limit,
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        type_: remapEnum(form.type, {
          Posts: "posts",
          Comments: "comments",
        } as const),
      },
      options,
    );

    const posts = content.items
      .filter((c) => c.type_ === "post")
      .map((c) => convertPost(c));

    const comments = content.items
      .filter((c) => c.type_ === "comment")
      .map((c) => convertComment(c));

    return {
      posts,
      comments,
      nextCursor: content.next_page ?? null,
    };
  }

  async getPosts(form: Forms.GetPosts, options: RequestOptions) {
    const sort = mapPostSort(form.sort);

    let multi_community_id: number | undefined = form.multiCommunityFeedId;
    if (form.multiCommunityFeedApId && _.isNil(multi_community_id)) {
      multi_community_id = (
        await this.resolveObjectId(form.multiCommunityFeedApId)
      ).multi_community_id;
      if (!multi_community_id) {
        throw Errors.OBJECT_NOT_FOUND;
      }
    }

    const posts = await this.client.getPosts(
      {
        show_read: form.showRead,
        sort: sort?.sort,
        time_range_seconds: sort?.timeRangeSeconds,
        type_: _.isNil(form.type)
          ? form.type
          : remapEnum(form.type, {
              All: "all",
              Local: "local",
              Subscribed: "subscribed",
              ModeratorView: "moderator_view",
            }),
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        limit: this.limit,
        community_name: form.communitySlug,
        multi_community_id,
      },
      options,
    );

    return {
      nextCursor: posts.next_page ?? null,
      posts: posts.items.map((p) => ({
        post: convertPost(p),
        creator: convertPerson({ person: p.creator }),
        community: convertCommunity({
          community: p.community,
          community_actions: p.community_actions,
        }),
      })),
    };
  }

  async search(form: Forms.Search, options: RequestOptions) {
    const topSort = form.type === "Communities" || form.type === "Users";
    const { search, next_page } = await this.client.search(
      {
        q: form.q,
        community_name: form.communitySlug,
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        type_: remapEnum(form.type, {
          Posts: "posts",
          Users: "users",
          Comments: "comments",
          Communities: "communities",
          All: "all",
        }),
        limit: form.limit ?? this.limit,
        sort: topSort ? "top" : "new",
        listing_type: "all",
      },
      options,
    );
    const posts = search.filter((r) => r.type_ === "post");
    const communities = search.filter((r) => r.type_ === "community");
    const comments = search.filter((r) => r.type_ === "comment");
    const users = search.filter((r) => r.type_ === "person");
    return {
      posts: posts.map(convertPost),
      communities: _.uniqBy(
        [
          ...communities.map(convertCommunity),
          ...posts.map((c) => convertCommunity({ community: c.community })),
          ...comments.map((c) => convertCommunity({ community: c.community })),
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
      nextCursor: next_page ?? null,
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
    const sort = mapCommunitySort(form.sort);
    const { items, next_page } = await this.client.listCommunities(
      {
        sort: sort.sort,
        time_range_seconds: sort.timeRangeSeconds,
        type_: _.isNil(form.type)
          ? form.type
          : remapEnum(form.type, {
              All: "all",
              Local: "local",
              Subscribed: "subscribed",
              ModeratorView: "moderator_view",
            }),
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
      },
      options,
    );

    return {
      communities: items.map(convertCommunity),
      nextCursor: next_page ?? null,
    };
  }

  async getMultiCommunityFeeds(form: Forms.GetMultiCommunityFeeds) {
    const { items } = await this.client.listMultiCommunities({
      limit: this.limit,
      type_: form.type
        ? remapEnum(form.type, {
            All: "all",
            Local: "local",
            Subscribed: "subscribed",
          } as const)
        : undefined,
    });
    return {
      multiCommunityFeeds: items.map(convertFeed),
      communities: [],
      nextCursor: null,
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
      throw new Error("couldn't find post");
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
  }

  async logout() {
    const { success } = await this.client.logout();
    if (!success) {
      throw new Error("failed to logout");
    }
  }

  async getComments(form: Forms.GetComments, options: RequestOptions) {
    let post_id: number | undefined = undefined;

    if (form.postApId) {
      post_id = (await this.resolveObjectId(form.postApId)).post_id;

      if (_.isNil(post_id)) {
        throw new Error("could not find post");
      }
    }

    const sort = mapCommentSort(form.sort);

    const { items, next_page } = await this.client.getComments(
      {
        post_id,
        type_: "all",
        sort,
        limit: this.limit,
        max_depth: form.maxDepth,
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
      },
      options,
    );

    return {
      comments: items.map(convertComment),
      creators: items.map(({ creator }) => convertPerson({ person: creator })),
      // Lemmy next cursor is broken when maxDepth is present.
      // It will page out to infinity until we get rate limited
      nextCursor: _.isNil(form.maxDepth) ? (next_page ?? null) : null,
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
      is_upvote: score === 0 ? undefined : score === 1,
    });
    return convertComment(comment_view);
  }

  async saveComment(form: Forms.SaveComment) {
    const { comment_view } = await this.client.saveComment({
      comment_id: form.commentId,
      save: form.save,
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

  async markPostRead(form: Forms.MarkPostRead) {
    const [firstPost] = form.postIds;
    if (form.postIds.length === 1 && firstPost) {
      await this.client.markPostAsRead({
        post_id: firstPost,
        read: form.read,
      });
    } else {
      if (form.read === false) {
        throw new Error("cant bulk mark multiple posts as unread");
      }
      await this.client.markManyPostAsRead({
        post_ids: form.postIds,
        read: true,
      });
    }
  }

  async login(form: Forms.Login) {
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
      if (isErrorLike(err) && is2faError(err)) {
        throw Errors.MFA_REQUIRED;
      }
      throw err;
    }
  }

  async getPrivateMessages(
    form: Forms.GetPrivateMessages,
    options: RequestOptions,
  ) {
    const { items, next_page } = await this.client.listNotifications(
      {
        type_: "private_message",
        unread_only: form.unreadOnly,
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
      },
      options,
    );
    const privateMessages = items.filter(
      (item) => item.data.type_ === "private_message",
    );
    const profiles = _.uniqBy(
      privateMessages.flatMap(({ data }) =>
        data.type_ === "private_message" ? [data.creator, data.recipient] : [],
      ),
      (p) => p.ap_id,
    ).map((person) => convertPerson({ person }));
    return {
      privateMessages: _.compact(
        privateMessages.map(({ data, notification }) =>
          data.type_ === "private_message"
            ? convertPrivateMessage(data, notification)
            : null,
        ),
      ),
      profiles,
      nextCursor: next_page ?? null,
    };
  }

  async createPrivateMessage(
    form: Forms.CreatePrivateMessage,
  ): Promise<Schemas.PrivateMessage> {
    const { private_message_view } = await this.client.createPrivateMessage({
      content: form.body,
      recipient_id: form.recipientId,
    });
    return convertPrivateMessage(private_message_view);
  }

  async markPrivateMessageRead(form: Forms.MarkPrivateMessageRead) {
    await this.client.markNotificationAsRead({
      notification_id: form.id,
      read: form.read,
    });
  }

  async getReplies(form: Forms.GetReplies, options: RequestOptions) {
    const { items, next_page } = await this.client.listNotifications(
      {
        type_: "reply",
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        unread_only: form.unreadOnly,
      },
      options,
    );
    const mentions = items.filter(({ data }) => data.type_ === "comment");

    return {
      replies: mentions.map(convertMentionReply),
      comments: _.compact(
        mentions.map(({ data }) =>
          data.type_ === "comment" ? convertComment(data) : null,
        ),
      ),
      profiles: _.unionBy(
        _.compact(
          mentions.map(({ data }) =>
            data.type_ === "comment"
              ? convertPerson({ person: data.creator })
              : null,
          ),
        ),
        (p) => p.apId,
      ),
      nextCursor: next_page ?? null,
    };
  }

  async getMentions(form: Forms.GetReplies, options: RequestOptions) {
    const { items, next_page } = await this.client.listNotifications(
      {
        type_: "mention",
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
        unread_only: form.unreadOnly,
      },
      options,
    );
    const mentions = items.filter(({ data }) => data.type_ === "comment");

    return {
      mentions: mentions.map(convertMentionReply),
      comments: _.compact(
        mentions.map(({ data }) =>
          data.type_ === "comment" ? convertComment(data) : null,
        ),
      ),
      profiles: _.unionBy(
        _.compact(
          mentions.map(({ data }) =>
            data.type_ === "comment"
              ? convertPerson({ person: data.creator })
              : null,
          ),
        ),
        (p) => p.apId,
      ),
      nextCursor: next_page ?? null,
    };
  }

  async markAllRead() {
    await this.client.markAllNotificationsAsRead();
  }

  async markReplyRead(form: Forms.MarkReplyRead) {
    await this.client.markNotificationAsRead({
      notification_id: form.id,
      read: form.read,
    });
  }

  async markMentionRead(form: Forms.MarkMentionRead) {
    await this.client.markNotificationAsRead({
      notification_id: form.id,
      read: form.read,
    });
  }

  async createPost(form: Forms.CreatePost) {
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
  }

  async createPostReport(form: Forms.CreatePostReport) {
    await this.client.createPostReport({
      post_id: form.postId,
      reason: form.reason,
    });
  }

  async removePost(form: Forms.RemovePost) {
    const { post_view } = await this.client.removePost({
      post_id: form.postId,
      removed: form.removed,
      reason: form.reason,
    });
    return convertPost(post_view);
  }

  async lockPost(form: Forms.LockPost) {
    const { post_view } = await this.client.lockPost({
      post_id: form.postId,
      locked: form.locked,
      // TODO: add support for this
      reason: "",
    });
    return convertPost(post_view);
  }

  async createCommentReport(form: Forms.CreateCommentReport) {
    await this.client.createCommentReport({
      comment_id: form.commentId,
      reason: form.reason,
    });
  }

  async removeComment(form: Forms.RemoveComment) {
    const { comment_view } = await this.client.removeComment({
      comment_id: form.commentId,
      removed: form.removed,
      reason: form.reason,
    });
    return convertComment(comment_view);
  }

  async lockComment(form: Forms.LockComment) {
    const { comment_view } = await this.client.lockComment({
      comment_id: form.commentId,
      locked: form.locked,
      // TODO: add support for this
      reason: "",
    });
    return convertComment(comment_view);
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

  async uploadImage(form: Forms.UploadImage) {
    const res = await this.client.uploadImage(form);
    const fileId = res.filename;
    if (!res.image_url && fileId) {
      res.image_url = `${this.instance}/pictrs/image/${fileId}`;
    }
    return { url: res.image_url };
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

  async saveUserSettings(form: Forms.SaveUserSettings) {
    await this.client.saveUserSettings({
      //avatar: form.avatar,
      //banner: form.banner,
      bio: form.bio,
      display_name: form.displayName,
      email: form.email,
    });
  }

  async removeUserAvatar() {
    await this.client.deleteUserAvatar();
  }

  async getPostReports(form: Forms.GetPostReports, options: RequestOptions) {
    const { items, next_page } = await this.client.listReports(
      {
        type_: "posts",
        unresolved_only: form.unresolvedOnly,
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
      },
      options,
    );
    const post_reports = _.compact(
      items.map((item) => (item.type_ === "post" ? item : null)),
    );
    return {
      postReports: post_reports.map(convertPostReport),
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
        }),
      ),
      communities: post_reports.map((report) =>
        convertCommunity({ community: report.community }),
      ),
      nextCursor: next_page ?? null,
    };
  }

  async getCommentReports(
    form: Forms.GetCommentReports,
    options: RequestOptions,
  ) {
    const { items, next_page } = await this.client.listReports(
      {
        type_: "comments",
        unresolved_only: form.unresolvedOnly,
        page_cursor:
          form.pageCursor === INIT_PAGE_TOKEN ? undefined : form.pageCursor,
      },
      options,
    );
    const comment_reports = _.compact(
      items.map((item) => (item.type_ === "comment" ? item : null)),
    );
    const commentReports = comment_reports.map(convertCommentReport);
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
        }),
      ),
      communities: comment_reports.map((report) =>
        convertCommunity({ community: report.community }),
      ),
      nextCursor: next_page ?? null,
    };
  }

  async resolvePostReport(form: Forms.ResolvePostReport) {
    const { post_report_view } = await this.client.resolvePostReport({
      report_id: form.reportId,
      resolved: form.resolved,
    });
    return convertPostReport(post_report_view);
  }

  async resolveCommentReport(form: Forms.ResolveCommentReport) {
    const { comment_report_view } = await this.client.resolveCommentReport({
      report_id: form.reportId,
      resolved: form.resolved,
    });
    return convertCommentReport(comment_report_view);
  }

  async resolveObject(form: Forms.ResolveObject, options?: RequestOptions) {
    const { resolve } = await this.client.resolveObject(
      {
        q: form.q,
      },
      options,
    );
    const post = resolve?.type_ === "post" ? resolve : undefined;
    const community = resolve?.type_ === "community" ? resolve : undefined;
    const person = resolve?.type_ === "person" ? resolve : undefined;
    const comment = resolve?.type_ === "comment" ? resolve : undefined;
    return resolveObjectResponseSchema.parse({
      post: post ? convertPost(post) : null,
      community: community ? convertCommunity(community) : null,
      user: person ? convertPerson(person) : null,
      comment: comment ? convertComment(comment) : null,
    });
  }

  async getLinkMetadata(form: Forms.GetLinkMetadata) {
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
