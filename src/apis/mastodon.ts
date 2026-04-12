import _ from "lodash";
import { createRestAPIClient, mastodon } from "masto";
import {
  ApiBlueprint,
  Errors,
  INIT_PAGE_TOKEN,
  RequestOptions,
  Schemas,
  Forms,
  Software,
} from "./api-blueprint";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Stable numeric hash for non-Snowflake strings (e.g. hashtag names). */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Convert a Mastodon Snowflake string ID to a safe integer by taking the low bits. */
function safeId(id: string): number {
  return parseInt(id.slice(-9), 10) || 0;
}

/** Normalise an acct to user@domain format. Local accounts omit the domain. */
function normaliseAcct(acct: string, domain: string): string {
  return acct.includes("@") ? acct : `${acct}@${domain}`;
}

function instanceDomain(instance: string): string {
  return instance.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function maxIdParam(pageCursor?: string): string | null {
  return pageCursor && pageCursor !== INIT_PAGE_TOKEN ? pageCursor : null;
}

// ---------------------------------------------------------------------------
// Conversion functions
// ---------------------------------------------------------------------------

function statusToPost(
  status: mastodon.v1.Status,
  instance: string,
): Schemas.Post {
  const domain = instanceDomain(instance);
  const src = status.reblog ?? status;

  const stripped = stripHtml(src.content);
  const title = src.spoilerText
    ? src.spoilerText
    : stripped.slice(0, 80) || "(no content)";

  const images = src.mediaAttachments.filter(
    (a) => a.type === "image" || a.type === "gifv",
  );
  const videos = src.mediaAttachments.filter((a) => a.type === "video");
  const thumb = images[0] ?? null;
  const aspect =
    thumb?.meta?.original && "aspect" in thumb.meta.original
      ? thumb.meta.original.aspect
      : null;

  return {
    id: safeId(status.id),
    apId: status.uri,
    createdAt: status.createdAt,
    title,
    body: stripped || null,
    url: status.url ?? null,
    thumbnailUrl: thumb?.previewUrl ?? null,
    thumbnailAspectRatio: aspect ?? null,
    embedVideoUrl: videos[0]?.url ?? null,
    urlContentType: null,
    altText: thumb?.description ?? null,
    communitySlug: `all@${domain}`,
    communityApId: instance,
    communityInstanceId: null,
    creatorId: safeId(src.account.id),
    creatorApId: src.account.url,
    creatorSlug: normaliseAcct(src.account.acct, domain),
    isBannedFromCommunity: false,
    upvotes: status.favouritesCount,
    downvotes: 0,
    commentsCount: status.repliesCount,
    nsfw: status.sensitive,
    locked: false,
    deleted: false,
    removed: false,
    saved: false,
    read: false,
    featuredCommunity: false,
    featuredLocal: false,
    crossPosts: [],
    flairs: [],
    emojiReactions: [],
    myVote: undefined,
    poll: undefined,
  } satisfies Schemas.Post;
}

function accountToPerson(
  account: mastodon.v1.Account,
  instance: string,
): Schemas.Person {
  const domain = instanceDomain(instance);
  return {
    id: safeId(account.id),
    apId: account.url,
    slug: normaliseAcct(account.acct, domain),
    avatar: account.avatar,
    createdAt: account.createdAt,
    isBot: account.bot,
    isBanned: account.suspended ?? false,
    deleted: false,
    matrixUserId: null,
    bio: stripHtml(account.note) || null,
    postCount: account.statusesCount,
    commentCount: null,
  } satisfies Schemas.Person;
}

function tagToFeed(
  tag: mastodon.v1.Tag,
  instance: string,
): Schemas.MultiCommunityFeed {
  const domain = instanceDomain(instance);
  const recentAccounts = (tag.history ?? [])
    .slice(0, 7)
    .reduce((sum, h) => sum + parseInt(h.accounts, 10), 0);

  return {
    id: hashStr(tag.name),
    apId: `${instance}/tags/${tag.name}`,
    slug: `${tag.name}@${domain}`,
    name: `#${tag.name}`,
    icon: null,
    banner: null,
    nsfw: false,
    communityCount: 0,
    subscriberCount: recentAccounts,
    description: null,
    communitySlugs: [],
    subscribed: tag.following ?? null,
    createdAt: new Date(0).toISOString(),
    ownerId: null,
    ownerApId: null,
    ownerSlug: null,
  } satisfies Schemas.MultiCommunityFeed;
}

function statusToComment(
  status: mastodon.v1.Status,
  instance: string,
  postApId?: string,
  path?: string,
): Schemas.Comment {
  const domain = instanceDomain(instance);
  const parentId = status.inReplyToId ?? status.id;
  const resolvedPostApId = postApId ?? `${instance}/statuses/${parentId}`;
  const postId = safeId(
    resolvedPostApId.match(/\/statuses\/(\d+)$/)?.[1] ?? parentId,
  );

  return {
    id: safeId(status.id),
    apId: status.uri,
    path: path ?? `0.${safeId(status.id)}`,
    body: stripHtml(status.content) || "(empty)",
    createdAt: status.createdAt,
    postId,
    postApId: resolvedPostApId,
    postTitle: "Mastodon post",
    communitySlug: `all@${domain}`,
    communityApId: instance,
    creatorId: safeId(status.account.id),
    creatorApId: status.account.url,
    creatorSlug: normaliseAcct(status.account.acct, domain),
    isBannedFromCommunity: false,
    upvotes: status.favouritesCount,
    downvotes: 0,
    childCount: status.repliesCount,
    myVote: null,
    locked: false,
    deleted: false,
    removed: false,
    saved: false,
    answer: false,
    emojiReactions: [],
  } satisfies Schemas.Comment;
}

// ---------------------------------------------------------------------------
// MastodonApi
// ---------------------------------------------------------------------------

export class MastodonApi implements ApiBlueprint<mastodon.rest.Client> {
  client: mastodon.rest.Client;
  limit = 25;
  software = Software.MASTODON;
  softwareVersion: string;

  private instance: string;
  private jwt?: string;
  private trendingFallback = false;

  constructor({
    instance,
    jwt,
    softwareVersion,
  }: {
    instance: string;
    jwt?: string;
    softwareVersion: string;
  }) {
    this.instance = instance.replace(/\/$/, "");
    this.jwt = jwt;
    this.softwareVersion = softwareVersion;
    this.client = createRestAPIClient({
      url: this.instance,
      accessToken: jwt,
    });
  }

  private async resolveStatusId(apId: string): Promise<string> {
    if (apId.startsWith(this.instance)) {
      const match = apId.match(/\/statuses\/(\d+)$/);
      if (match) {
        return match[1]!;
      }
    }
    const result = await this.client.v2.search.list({
      q: apId,
      type: "statuses",
      resolve: this.jwt ? true : false,
    });
    const first = result.statuses[0];
    if (!first) {
      throw Errors.OBJECT_NOT_FOUND;
    }
    return first.id;
  }

  private resolveAccount = _.memoize(
    async (apIdOrUsername: string): Promise<mastodon.v1.Account> => {
      if (apIdOrUsername.startsWith("http")) {
        if (apIdOrUsername.startsWith(this.instance)) {
          const match = apIdOrUsername.match(/\/users\/([\w-]+)$/);
          if (match) {
            return this.client.v1.accounts.lookup({ acct: match[1]! });
          }
        }
        const result = await this.client.v2.search.list({
          q: apIdOrUsername,
          type: "accounts",
          resolve: this.jwt ? true : false,
        });
        const first = result.accounts[0];
        if (!first) {
          throw Errors.OBJECT_NOT_FOUND;
        }
        return first;
      }
      const acct = apIdOrUsername.startsWith("@")
        ? apIdOrUsername.slice(1)
        : apIdOrUsername;
      return this.client.v1.accounts.lookup({ acct });
    },
    (apIdOrUsername) => apIdOrUsername,
  );

  // -------------------------------------------------------------------------
  // Site
  // -------------------------------------------------------------------------

  async getSite(_options?: RequestOptions): Promise<{
    site: Schemas.Site;
    communities?: Schemas.Community[];
    profiles?: Schemas.Person[];
  }> {
    const [instanceInfo, me] = await Promise.all([
      this.client.v1.instance.fetch(),
      this.jwt
        ? this.client.v1.accounts.verifyCredentials().catch(() => null)
        : Promise.resolve(null),
    ]);

    const domain = instanceDomain(this.instance);

    const site: Schemas.Site = {
      instance: this.instance,
      privateInstance: false,
      version: this.softwareVersion,
      description:
        instanceInfo.shortDescription ?? instanceInfo.description ?? null,
      sidebar: instanceInfo.description ?? null,
      title: instanceInfo.title ?? null,
      icon: instanceInfo.thumbnail ?? null,
      me: me ? accountToPerson(me, this.instance) : null,
      myEmail: null,
      admins: null,
      moderates: null,
      follows: null,
      personBlocks: null,
      communityBlocks: null,
      instanceBlocks: null,
      userCount: instanceInfo.stats.userCount ?? null,
      usersActiveDayCount: null,
      usersActiveWeekCount: null,
      usersActiveMonthCount: null,
      usersActiveHalfYearCount: null,
      postCount: instanceInfo.stats.statusCount ?? null,
      commentCount: null,
      applicationQuestion: null,
      registrationMode: instanceInfo.registrations ? "Open" : "Closed",
      showNsfw: true,
      blurNsfw: true,
      enablePostDownvotes: false,
      enableCommentDownvotes: false,
      software: Software.MASTODON,
    };

    const placeholderCommunity: Schemas.Community = {
      id: safeId(domain.replace(/\./g, "")),
      apId: this.instance,
      slug: `all@${domain}`,
      icon: null,
      nsfw: false,
      createdAt: new Date(0).toISOString(),
    };

    return { site, communities: [placeholderCommunity] };
  }

  // -------------------------------------------------------------------------
  // Posts / Feed
  // -------------------------------------------------------------------------

  async getPosts(
    form: Forms.GetPosts,
    _options: RequestOptions,
  ): Promise<{
    nextCursor: string | null;
    posts: {
      post: Schemas.Post;
      community?: Schemas.Community;
      creator?: Schemas.Person;
      flairs?: Schemas.Flair[];
    }[];
  }> {
    const limit = form.limit ?? this.limit;
    const maxId = maxIdParam(form.pageCursor);

    // Hashtag timeline
    if (form.multiCommunityFeedApId) {
      const tagName = form.multiCommunityFeedApId.match(/\/tags\/(.+)$/)?.[1];
      if (tagName) {
        const statuses = await this.client.v1.timelines.tag
          .$select(tagName)
          .list({ limit, maxId });
        return {
          posts: statuses.map((s) => ({
            post: statusToPost(s, this.instance),
            creator: accountToPerson(
              s.reblog ? s.reblog.account : s.account,
              this.instance,
            ),
          })),
          nextCursor: statuses.at(-1)?.id ?? null,
        };
      }
    }

    // Home timeline (requires auth)
    if (form.type === "Subscribed") {
      const statuses = await this.client.v1.timelines.home.list({
        limit,
        maxId,
      });
      return {
        posts: this.statusesToPostItems(statuses),
        nextCursor: statuses.at(-1)?.id ?? null,
      };
    }

    // Trending fallback
    if (this.trendingFallback) {
      const statuses = await this.client.v1.trends.statuses.list({ limit });
      return {
        posts: this.statusesToPostItems(statuses),
        nextCursor: null, // trends API doesn't support maxId cursor
      };
    }

    // Public / local timeline with trending fallback on auth error
    try {
      const statuses = await this.client.v1.timelines.public.list({
        limit,
        maxId,
        local: form.type === "Local" ? true : undefined,
      });
      return {
        posts: this.statusesToPostItems(statuses),
        nextCursor: statuses.at(-1)?.id ?? null,
      };
    } catch {
      this.trendingFallback = true;
      const statuses = await this.client.v1.trends.statuses.list({ limit });
      return {
        posts: this.statusesToPostItems(statuses),
        nextCursor: null,
      };
    }
  }

  private statusesToPostItems(statuses: mastodon.v1.Status[]) {
    const domain = instanceDomain(this.instance);
    const placeholderCommunity: Schemas.Community = {
      id: safeId(domain.replace(/\./g, "")),
      apId: this.instance,
      slug: `all@${domain}`,
      icon: null,
      nsfw: false,
      createdAt: new Date(0).toISOString(),
    };
    return statuses.map((s) => ({
      post: statusToPost(s, this.instance),
      community: placeholderCommunity,
      creator: accountToPerson(
        s.reblog ? s.reblog.account : s.account,
        this.instance,
      ),
    }));
  }

  async getPost(
    form: { apId: string },
    _options: RequestOptions,
  ): Promise<{
    post: Schemas.Post;
    community: Schemas.Community | undefined;
    profiles: Schemas.Person[] | undefined;
    flairs: Schemas.Flair[] | undefined;
  }> {
    const statusId = await this.resolveStatusId(form.apId);
    const status = await this.client.v1.statuses.$select(statusId).fetch();
    const creator = accountToPerson(
      status.reblog ? status.reblog.account : status.account,
      this.instance,
    );
    return {
      post: statusToPost(status, this.instance),
      community: undefined,
      profiles: [creator],
      flairs: undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------

  async getComments(
    form: Forms.GetComments,
    _options: RequestOptions,
  ): Promise<{
    comments: Schemas.Comment[];
    creators: Schemas.Person[];
    nextCursor: string | null;
  }> {
    if (!form.postApId) {
      return { comments: [], creators: [], nextCursor: null };
    }

    const statusId = await this.resolveStatusId(form.postApId);
    const context = await this.client.v1.statuses
      .$select(statusId)
      .context.fetch();

    const safeIdMap = new Map<string, number>();
    for (const s of context.descendants) {
      safeIdMap.set(s.id, safeId(s.id));
    }

    const buildPath = (status: mastodon.v1.Status): string => {
      const parts: number[] = [safeId(status.id)];
      let parentId = status.inReplyToId ?? null;
      while (parentId && safeIdMap.has(parentId)) {
        parts.unshift(safeIdMap.get(parentId)!);
        const parent = context.descendants.find((s) => s.id === parentId);
        parentId = parent?.inReplyToId ?? null;
      }
      return `0.${parts.join(".")}`;
    };

    const comments = context.descendants.map((s) =>
      statusToComment(s, this.instance, form.postApId!, buildPath(s)),
    );
    const creators = context.descendants.map((s) =>
      accountToPerson(s.account, this.instance),
    );

    return { comments, creators, nextCursor: null };
  }

  // -------------------------------------------------------------------------
  // Person / User profile
  // -------------------------------------------------------------------------

  async getPerson(
    form: Forms.GetPerson,
    _options: RequestOptions,
  ): Promise<Schemas.Person> {
    const account = await this.resolveAccount(form.apIdOrUsername);
    return accountToPerson(account, this.instance);
  }

  async getPersonContent(
    form: Forms.GetPersonContent,
    _options: RequestOptions,
  ): Promise<{
    posts: Schemas.Post[];
    comments: Schemas.Comment[];
    nextCursor: string | null;
  }> {
    const account = await this.resolveAccount(form.apIdOrUsername);
    const maxId = maxIdParam(form.pageCursor);

    if (form.type === "Comments") {
      const statuses = await this.client.v1.accounts
        .$select(account.id)
        .statuses.list({
          limit: this.limit * 2, // fetch extra to compensate for filtering
          maxId,
          excludeReblogs: true,
        });
      const replies = statuses.filter((s) => s.inReplyToId !== null);
      return {
        posts: [],
        comments: replies.map((s) => statusToComment(s, this.instance)),
        nextCursor: statuses.at(-1)?.id ?? null,
      };
    }

    const statuses = await this.client.v1.accounts
      .$select(account.id)
      .statuses.list({
        limit: this.limit,
        maxId,
        excludeReplies: true,
        excludeReblogs: true,
      });
    return {
      posts: statuses.map((s) => statusToPost(s, this.instance)),
      comments: [],
      nextCursor: statuses.at(-1)?.id ?? null,
    };
  }

  // -------------------------------------------------------------------------
  // Multi-community feeds (hashtags)
  // -------------------------------------------------------------------------

  async getMultiCommunityFeeds(
    _form: Forms.GetMultiCommunityFeeds,
    _options?: RequestOptions,
  ): Promise<{
    multiCommunityFeeds: Schemas.MultiCommunityFeed[];
    nextCursor: null;
  }> {
    const tags = await this.client.v1.trends.tags.list({ limit: 20 });
    return {
      multiCommunityFeeds: tags.map((t) => tagToFeed(t, this.instance)),
      nextCursor: null,
    };
  }

  async getMultiCommunityFeed(
    form: Forms.GetMultiCommunityFeed,
    _options?: RequestOptions,
  ): Promise<{
    feed: Schemas.MultiCommunityFeed;
    communities: Schemas.Community[];
    owner: Schemas.Person | null;
  }> {
    const tagName = form.apId.match(/\/tags\/(.+)$/)?.[1];
    if (!tagName) {
      throw Errors.OBJECT_NOT_FOUND;
    }
    const tag = await this.client.v1.tags.$select(tagName).fetch();
    return {
      feed: tagToFeed(tag, this.instance),
      communities: [],
      owner: null,
    };
  }

  // -------------------------------------------------------------------------
  // Sort lists
  // -------------------------------------------------------------------------

  getPostSorts(): readonly string[] {
    return ["New"] as const;
  }

  getCommentSorts(): readonly string[] {
    return [] as const;
  }

  getCommunitySorts(): readonly string[] {
    return [] as const;
  }

  // -------------------------------------------------------------------------
  // Unsupported / stubbed operations
  // -------------------------------------------------------------------------

  async search(
    _form: Forms.Search,
    _options: RequestOptions,
  ): Promise<{
    posts: Schemas.Post[];
    communities: Schemas.Community[];
    comments: Schemas.Comment[];
    users: Schemas.Person[];
    nextCursor: string | null;
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async getCommunity(
    _form: Forms.GetCommunity,
    _options: RequestOptions,
  ): Promise<{
    community: Schemas.Community;
    mods: Schemas.Person[];
    flairs?: Schemas.Flair[];
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async getCommunities(
    _form: Forms.GetCommunities,
    _options: RequestOptions,
  ): Promise<{ communities: Schemas.Community[]; nextCursor: string | null }> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async followCommunity(
    _form: Forms.FollowCommunity,
  ): Promise<Schemas.Community> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async followFeed(
    _form: Forms.FollowFeed,
  ): Promise<Schemas.MultiCommunityFeed> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async logout(): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async login(_form: Forms.Login): Promise<{ jwt: string }> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async votePostPoll(_form: Forms.PostPollVote): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async savePost(_form: Forms.SavePost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async likePost(_form: Forms.LikePost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async markPostRead(_form: Forms.MarkPostRead): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async deletePost(_form: Forms.DeletePost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async editPost(_form: Forms.EditPost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async featurePost(_form: Forms.FeaturePost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async createPost(_form: Forms.CreatePost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async createComment(_form: Forms.CreateComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async likeComment(_form: Forms.LikeComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async saveComment(_form: Forms.SaveComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async deleteComment(_form: Forms.DeleteComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async editComment(_form: Forms.EditComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async getPrivateMessages(
    _form: Forms.GetPrivateMessages,
    _options: RequestOptions,
  ): Promise<{
    privateMessages: Schemas.PrivateMessage[];
    profiles: Schemas.Person[];
    nextCursor: string | null;
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async createPrivateMessage(
    _form: Forms.CreatePrivateMessage,
  ): Promise<Schemas.PrivateMessage> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async markPrivateMessageRead(
    _form: Forms.MarkPrivateMessageRead,
  ): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async getReplies(
    _form: Forms.GetReplies,
    _options: RequestOptions,
  ): Promise<{
    replies: Schemas.Reply[];
    comments: Schemas.Comment[];
    profiles: Schemas.Person[];
    nextCursor: string | null;
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async getMentions(
    _form: Forms.GetMentions,
    _options: RequestOptions,
  ): Promise<{
    mentions: Schemas.Mention[];
    comments: Schemas.Comment[];
    profiles: Schemas.Person[];
    nextCursor: string | null;
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async markAllRead(): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async markReplyRead(_form: Forms.MarkReplyRead): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async markMentionRead(_form: Forms.MarkMentionRead): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async createPostReport(_form: Forms.CreatePostReport): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async removePost(_form: Forms.RemovePost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async lockPost(_form: Forms.LockPost): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async removeComment(_form: Forms.RemoveComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async lockComment(_form: Forms.LockComment): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async markCommentAsAnswer(
    _form: Forms.MarkCommentAsAnswer,
  ): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async addCommentReactionEmoji(
    _form: Forms.AddCommentReactionEmoji,
  ): Promise<Schemas.Comment> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async addPostReactionEmoji(
    _form: Forms.AddPostReactionEmoji,
  ): Promise<Schemas.Post> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async getLinkMetadata(
    _form: Forms.GetLinkMetadata,
  ): Promise<Schemas.LinkMetadata> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async createCommentReport(_form: Forms.CreateCommentReport): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async blockPerson(_form: Forms.BlockPerson): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async blockCommunity(_form: Forms.BlockCommunity): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async blockInstance(_form: Forms.BlockInstance): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async uploadImage(
    _form: Forms.UploadImage,
  ): Promise<Schemas.UploadImageResponse> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async getCaptcha(_options: RequestOptions): Promise<Schemas.Captcha> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async register(_form: Forms.Register): Promise<Schemas.Registration> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async saveUserSettings(_form: Forms.SaveUserSettings): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async removeUserAvatar(): Promise<void> {
    throw Errors.NOT_IMPLEMENTED;
  }

  async getPostReports(
    _form: Forms.GetPostReports,
    _options?: RequestOptions,
  ): Promise<{
    nextCursor: string | null;
    postReports: Schemas.PostReport[];
    users: Schemas.Person[];
    posts: Schemas.Post[];
    communities: Schemas.Community[];
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async getCommentReports(
    _form: Forms.GetCommentReports,
    _options?: RequestOptions,
  ): Promise<{
    nextCursor: string | null;
    commentReports: Schemas.CommentReport[];
    users: Schemas.Person[];
    comments: Schemas.Comment[];
    communities: Schemas.Community[];
  }> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async resolvePostReport(
    _form: Forms.ResolvePostReport,
  ): Promise<Schemas.PostReport> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async resolveCommentReport(
    _form: Forms.ResolvePostReport,
  ): Promise<Schemas.CommentReport> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async resolveObject(
    _form: Forms.ResolveObject,
    _options?: RequestOptions,
  ): Promise<Schemas.ResolveObject> {
    throw Errors.NOT_IMPLEMENTED;
  }
  async getModlog(
    _form: Forms.GetModlog,
    _options: RequestOptions,
  ): Promise<{ items: Schemas.ModlogItem[]; nextCursor: string | null }> {
    throw Errors.NOT_IMPLEMENTED;
  }
}
