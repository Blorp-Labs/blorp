import _ from "lodash";
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
// Mastodon REST API response types (minimal)
// ---------------------------------------------------------------------------

interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  url: string;
  display_name: string;
  note: string;
  avatar: string;
  created_at: string;
  bot: boolean;
  suspended?: boolean;
  statuses_count: number;
  followers_count: number;
}

interface MastodonMediaAttachment {
  type: string;
  url: string;
  preview_url: string;
  description: string | null;
  meta?: { original?: { aspect?: number } };
}

interface MastodonStatus {
  id: string;
  uri: string;
  url: string | null;
  content: string;
  created_at: string;
  account: MastodonAccount;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  sensitive: boolean;
  spoiler_text: string;
  media_attachments: MastodonMediaAttachment[];
  reblog: MastodonStatus | null;
  in_reply_to_id: string | null;
  in_reply_to_account_id: string | null;
}

interface MastodonInstance {
  uri: string;
  title: string;
  description: string;
  short_description: string | null;
  stats: {
    user_count: number;
    status_count: number;
  };
}

interface MastodonSearchResult {
  statuses: MastodonStatus[];
  accounts: MastodonAccount[];
}

interface MastodonTagHistory {
  day: string;
  accounts: string;
  uses: string;
}

interface MastodonTag {
  name: string;
  url: string;
  history: MastodonTagHistory[];
  following?: boolean;
}

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
  // Mastodon Snowflake IDs are 18-digit strings. We take the last 9 digits
  // to stay within Number.MAX_SAFE_INTEGER. Only used for schema compliance —
  // all mutations are stubbed so collisions are harmless.
  return parseInt(id.slice(-9), 10) || 0;
}

/** Normalise an acct to user@domain format. Local accounts omit the domain. */
function normaliseAcct(acct: string, instanceDomain: string): string {
  return acct.includes("@") ? acct : `${acct}@${instanceDomain}`;
}

function instanceDomain(instance: string): string {
  return instance.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Conversion functions
// ---------------------------------------------------------------------------

function statusToPost(status: MastodonStatus, instance: string): Schemas.Post {
  const domain = instanceDomain(instance);
  const communitySlug = `all@${domain}`;
  const communityApId = instance;

  const content = status.reblog ? status.reblog.content : status.content;
  const spoiler = status.reblog
    ? status.reblog.spoiler_text
    : status.spoiler_text;
  const stripped = stripHtml(content);

  const title = spoiler ? spoiler : stripped.slice(0, 80) || "(no content)";
  const body = stripped || null;

  const account = status.reblog ? status.reblog.account : status.account;

  const images = status.media_attachments.filter(
    (a) => a.type === "image" || a.type === "gifv",
  );
  const videos = status.media_attachments.filter((a) => a.type === "video");

  const thumbnailAttachment = images[0] ?? null;
  const thumbnailUrl = thumbnailAttachment?.preview_url ?? null;
  const thumbnailAspectRatio =
    thumbnailAttachment?.meta?.original?.aspect ?? null;
  const embedVideoUrl = videos[0]?.url ?? null;

  // If there's an external link in the status, surface it as url
  const url = status.url ?? null;

  return {
    id: safeId(status.id),
    apId: status.uri,
    createdAt: status.created_at,
    title,
    body,
    url,
    thumbnailUrl,
    thumbnailAspectRatio: thumbnailAspectRatio ?? null,
    embedVideoUrl,
    urlContentType: null,
    altText: thumbnailAttachment?.description ?? null,
    communitySlug,
    communityApId,
    communityInstanceId: null,
    creatorId: safeId(account.id),
    creatorApId: account.url,
    creatorSlug: normaliseAcct(account.acct, domain),
    isBannedFromCommunity: false,
    upvotes: status.favourites_count,
    downvotes: 0,
    commentsCount: status.replies_count,
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
  account: MastodonAccount,
  instance: string,
): Schemas.Person {
  const domain = instanceDomain(instance);
  return {
    id: safeId(account.id),
    apId: account.url,
    slug: normaliseAcct(account.acct, domain),
    avatar: account.avatar,
    createdAt: account.created_at,
    isBot: account.bot,
    isBanned: account.suspended ?? false,
    deleted: false,
    matrixUserId: null,
    bio: stripHtml(account.note) || null,
    postCount: account.statuses_count,
    commentCount: null,
  } satisfies Schemas.Person;
}

function tagToFeed(
  tag: MastodonTag,
  instance: string,
): Schemas.MultiCommunityFeed {
  const domain = instanceDomain(instance);
  // Sum recent account usage across history days as a proxy for subscriber count
  const recentAccounts = tag.history
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
  status: MastodonStatus,
  instance: string,
  postApId?: string,
  path?: string,
): Schemas.Comment {
  const domain = instanceDomain(instance);
  const communitySlug = `all@${domain}`;
  const communityApId = instance;

  // When called from getPersonContent (user's replies), postApId and path are
  // not known without extra fetches — use best-effort values.
  const parentId = status.in_reply_to_id ?? status.id;
  const resolvedPostApId = postApId ?? `${instance}/statuses/${parentId}`;
  const postId = safeId(
    resolvedPostApId.match(/\/statuses\/(\d+)$/)?.[1] ?? parentId,
  );
  const resolvedPath = path ?? `0.${safeId(status.id)}`;

  return {
    id: safeId(status.id),
    apId: status.uri,
    path: resolvedPath,
    body: stripHtml(status.content) || "(empty)",
    createdAt: status.created_at,
    postId,
    postApId: resolvedPostApId,
    postTitle: "Mastodon post",
    communitySlug,
    communityApId,
    creatorId: safeId(status.account.id),
    creatorApId: status.account.url,
    creatorSlug: normaliseAcct(status.account.acct, domain),
    isBannedFromCommunity: false,
    upvotes: status.favourites_count,
    downvotes: 0,
    childCount: status.replies_count,
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

export class MastodonApi implements ApiBlueprint<null> {
  client: null = null;
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
  }

  private async apiFetch<T>(
    path: string,
    init?: RequestInit & { signal?: AbortSignal },
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.jwt) {
      headers["Authorization"] = `Bearer ${this.jwt}`;
    }
    const res = await fetch(`${this.instance}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Mastodon API error ${res.status}: ${path}`);
    }
    return res.json() as Promise<T>;
  }

  private async resolveStatusId(
    apId: string,
    signal?: AbortSignal,
  ): Promise<string> {
    // Local object: extract numeric ID from URI path (.../statuses/<id>)
    if (apId.startsWith(this.instance)) {
      const match = apId.match(/\/statuses\/(\d+)$/);
      if (match) {
        return match[1]!;
      }
    }
    // resolve=true federates remote objects but requires authentication.
    // Without auth, search can still find locally-cached copies.
    const resolveParam = this.jwt ? "&resolve=true" : "";
    const result = await this.apiFetch<MastodonSearchResult>(
      `/api/v2/search?q=${encodeURIComponent(apId)}${resolveParam}&type=statuses`,
      { signal },
    );
    const first = result.statuses[0];
    if (!first) {
      throw Errors.OBJECT_NOT_FOUND;
    }
    return first.id;
  }

  private resolveAccount = _.memoize(
    async (apIdOrUsername: string): Promise<MastodonAccount> => {
      if (apIdOrUsername.startsWith("http")) {
        // Local account URL: extract username and use the lookup endpoint,
        // which works without auth.
        if (apIdOrUsername.startsWith(this.instance)) {
          const match = apIdOrUsername.match(/\/users\/([\w-]+)$/);
          if (match) {
            return this.apiFetch<MastodonAccount>(
              `/api/v1/accounts/lookup?acct=${encodeURIComponent(match[1]!)}`,
            );
          }
        }
        // Remote URL: search with resolve=true (auth required) or without
        // (finds locally-cached copies only).
        const resolveParam = this.jwt ? "&resolve=true" : "";
        const result = await this.apiFetch<MastodonSearchResult>(
          `/api/v2/search?q=${encodeURIComponent(apIdOrUsername)}${resolveParam}&type=accounts`,
        );
        const first = result.accounts[0];
        if (!first) {
          throw Errors.OBJECT_NOT_FOUND;
        }
        return first;
      }
      // username or user@domain → lookup endpoint (always auth-free)
      const acct = apIdOrUsername.startsWith("@")
        ? apIdOrUsername.slice(1)
        : apIdOrUsername;
      return this.apiFetch<MastodonAccount>(
        `/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`,
      );
    },
    (apIdOrUsername) => apIdOrUsername,
  );

  // -------------------------------------------------------------------------
  // Site
  // -------------------------------------------------------------------------

  async getSite(options?: RequestOptions): Promise<{
    site: Schemas.Site;
    communities?: Schemas.Community[];
    profiles?: Schemas.Person[];
  }> {
    const [instanceInfo, me] = await Promise.all([
      this.apiFetch<MastodonInstance>("/api/v1/instance", options),
      this.jwt
        ? this.apiFetch<MastodonAccount>(
            "/api/v1/accounts/verify_credentials",
            options,
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    const domain = instanceDomain(this.instance);

    const site: Schemas.Site = {
      instance: this.instance,
      privateInstance: false,
      version: this.softwareVersion,
      description:
        instanceInfo.short_description ?? instanceInfo.description ?? null,
      sidebar: instanceInfo.description ?? null,
      title: instanceInfo.title ?? null,
      icon: null,
      me: me ? accountToPerson(me, this.instance) : null,
      myEmail: null,
      admins: null,
      moderates: null,
      follows: null,
      personBlocks: null,
      communityBlocks: null,
      instanceBlocks: null,
      userCount: instanceInfo.stats.user_count ?? null,
      usersActiveDayCount: null,
      usersActiveWeekCount: null,
      usersActiveMonthCount: null,
      usersActiveHalfYearCount: null,
      postCount: instanceInfo.stats.status_count ?? null,
      commentCount: null,
      applicationQuestion: null,
      registrationMode: "Open",
      showNsfw: true,
      blurNsfw: true,
      enablePostDownvotes: false,
      enableCommentDownvotes: false,
      software: Software.MASTODON,
    };

    // Provide a placeholder community representing the instance feed
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
    options: RequestOptions,
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

    // Hashtag timeline — multiCommunityFeedApId encodes the tag as
    // ${instance}/tags/${name}
    if (form.multiCommunityFeedApId) {
      const tagName = form.multiCommunityFeedApId.match(/\/tags\/(.+)$/)?.[1];
      if (tagName) {
        const cursor =
          form.pageCursor && form.pageCursor !== INIT_PAGE_TOKEN
            ? `&max_id=${encodeURIComponent(form.pageCursor)}`
            : "";
        const statuses = await this.apiFetch<MastodonStatus[]>(
          `/api/v1/timelines/tag/${encodeURIComponent(tagName)}?limit=${limit}${cursor}`,
          options,
        );
        const posts = statuses.map((status) => ({
          post: statusToPost(status, this.instance),
          creator: accountToPerson(
            status.reblog ? status.reblog.account : status.account,
            this.instance,
          ),
        }));
        return { posts, nextCursor: statuses.at(-1)?.id ?? null };
      }
    }

    // Trending fallback: some instances (e.g. mastodon.social) require auth for
    // public/local timelines. We detect this on first attempt and remember it.
    // Trending statuses are always publicly accessible.
    // Cursor encoding: "t:<offset>" for trending, "<max_id>" for timelines.
    const isTrendingCursor =
      form.pageCursor && form.pageCursor.startsWith("t:");
    const needsTrending = this.trendingFallback || isTrendingCursor;

    let statuses: MastodonStatus[];

    if (needsTrending || form.type === "Subscribed") {
      if (form.type === "Subscribed") {
        // home timeline — requires auth, let it fail naturally
        const cursor =
          form.pageCursor && form.pageCursor !== INIT_PAGE_TOKEN
            ? `&max_id=${encodeURIComponent(form.pageCursor)}`
            : "";
        statuses = await this.apiFetch<MastodonStatus[]>(
          `/api/v1/timelines/home?limit=${limit}${cursor}`,
          options,
        );
      } else {
        const offset = isTrendingCursor
          ? parseInt(form.pageCursor!.slice(2), 10)
          : 0;
        statuses = await this.apiFetch<MastodonStatus[]>(
          `/api/v1/trends/statuses?limit=${limit}&offset=${offset}`,
          options,
        );
      }
    } else {
      const localParam = form.type === "Local" ? "&local=true" : "";
      const cursor =
        form.pageCursor && form.pageCursor !== INIT_PAGE_TOKEN
          ? `&max_id=${encodeURIComponent(form.pageCursor)}`
          : "";
      try {
        statuses = await this.apiFetch<MastodonStatus[]>(
          `/api/v1/timelines/public?limit=${limit}${localParam}${cursor}`,
          options,
        );
      } catch {
        // Instance restricts public timeline to authenticated users — use trending
        this.trendingFallback = true;
        statuses = await this.apiFetch<MastodonStatus[]>(
          `/api/v1/trends/statuses?limit=${limit}&offset=0`,
          options,
        );
      }
    }

    const domain = instanceDomain(this.instance);
    const placeholderCommunity: Schemas.Community = {
      id: safeId(domain.replace(/\./g, "")),
      apId: this.instance,
      slug: `all@${domain}`,
      icon: null,
      nsfw: false,
      createdAt: new Date(0).toISOString(),
    };

    const posts = statuses.map((status) => {
      const post = statusToPost(status, this.instance);
      const creator = accountToPerson(
        status.reblog ? status.reblog.account : status.account,
        this.instance,
      );
      return { post, community: placeholderCommunity, creator };
    });

    let nextCursor: string | null = null;
    if (statuses.length > 0) {
      if (this.trendingFallback || isTrendingCursor) {
        // Trending uses offset pagination
        const currentOffset = isTrendingCursor
          ? parseInt(form.pageCursor!.slice(2), 10)
          : 0;
        nextCursor = `t:${currentOffset + statuses.length}`;
      } else {
        nextCursor = statuses.at(-1)?.id ?? null;
      }
    }

    return { posts, nextCursor };
  }

  async getPost(
    form: { apId: string },
    options: RequestOptions,
  ): Promise<{
    post: Schemas.Post;
    community: Schemas.Community | undefined;
    profiles: Schemas.Person[] | undefined;
    flairs: Schemas.Flair[] | undefined;
  }> {
    const statusId = await this.resolveStatusId(form.apId, options.signal);
    const status = await this.apiFetch<MastodonStatus>(
      `/api/v1/statuses/${statusId}`,
      options,
    );

    const post = statusToPost(status, this.instance);
    const creator = accountToPerson(
      status.reblog ? status.reblog.account : status.account,
      this.instance,
    );

    return {
      post,
      community: undefined,
      profiles: [creator],
      flairs: undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Comments — Mastodon status replies mapped as comments
  // -------------------------------------------------------------------------

  async getComments(
    form: Forms.GetComments,
    options: RequestOptions,
  ): Promise<{
    comments: Schemas.Comment[];
    creators: Schemas.Person[];
    nextCursor: string | null;
  }> {
    if (!form.postApId) {
      return { comments: [], creators: [], nextCursor: null };
    }

    const statusId = await this.resolveStatusId(form.postApId, options.signal);
    const context = await this.apiFetch<{
      ancestors: MastodonStatus[];
      descendants: MastodonStatus[];
    }>(`/api/v1/statuses/${statusId}/context`, options);

    // Build a lookup from Mastodon status ID → safeId so we can construct
    // ltree paths. The post itself is the implicit root "0".
    const safeIdMap = new Map<string, number>();
    for (const s of context.descendants) {
      safeIdMap.set(s.id, safeId(s.id));
    }

    const buildPath = (status: MastodonStatus): string => {
      const parts: number[] = [safeId(status.id)];
      let parentId = status.in_reply_to_id;
      // Walk up until we hit the post itself (not in descendants map = it's
      // the post or an ancestor above the post — treat as root "0").
      while (parentId && safeIdMap.has(parentId)) {
        parts.unshift(safeIdMap.get(parentId)!);
        const parent = context.descendants.find((s) => s.id === parentId);
        parentId = parent?.in_reply_to_id ?? null;
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
    options: RequestOptions,
  ): Promise<{
    posts: Schemas.Post[];
    comments: Schemas.Comment[];
    nextCursor: string | null;
  }> {
    const account = await this.resolveAccount(form.apIdOrUsername);

    const cursor =
      form.pageCursor && form.pageCursor !== INIT_PAGE_TOKEN
        ? `&max_id=${encodeURIComponent(form.pageCursor)}`
        : "";

    if (form.type === "Comments") {
      // Fetch statuses including replies, then filter to only replies.
      // We fetch extra to compensate for filtering out original posts.
      const fetchLimit = this.limit * 2;
      const url = `/api/v1/accounts/${account.id}/statuses?limit=${fetchLimit}&exclude_reblogs=true${cursor}`;
      const statuses = await this.apiFetch<MastodonStatus[]>(url, options);

      const replies = statuses.filter((s) => s.in_reply_to_id !== null);
      const comments = replies.map((s) => statusToComment(s, this.instance));
      const nextCursor = statuses.at(-1)?.id ?? null;

      return { posts: [], comments, nextCursor };
    }

    const url = `/api/v1/accounts/${account.id}/statuses?limit=${this.limit}&exclude_replies=true&exclude_reblogs=true${cursor}`;
    const statuses = await this.apiFetch<MastodonStatus[]>(url, options);
    const posts = statuses.map((s) => statusToPost(s, this.instance));
    const nextCursor = statuses.at(-1)?.id ?? null;

    return { posts, comments: [], nextCursor };
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

  async getMultiCommunityFeeds(
    _form: Forms.GetMultiCommunityFeeds,
    options?: RequestOptions,
  ): Promise<{
    multiCommunityFeeds: Schemas.MultiCommunityFeed[];
    nextCursor: null;
  }> {
    const tags = await this.apiFetch<MastodonTag[]>(
      "/api/v1/trends/tags?limit=20",
      options,
    );
    return {
      multiCommunityFeeds: tags.map((t) => tagToFeed(t, this.instance)),
      nextCursor: null,
    };
  }

  async getMultiCommunityFeed(
    form: Forms.GetMultiCommunityFeed,
    options?: RequestOptions,
  ): Promise<{
    feed: Schemas.MultiCommunityFeed;
    communities: Schemas.Community[];
    owner: Schemas.Person | null;
  }> {
    const tagName = form.apId.match(/\/tags\/(.+)$/)?.[1];
    if (!tagName) {
      throw Errors.OBJECT_NOT_FOUND;
    }
    const tag = await this.apiFetch<MastodonTag>(
      `/api/v1/tags/${encodeURIComponent(tagName)}`,
      options,
    );
    return {
      feed: tagToFeed(tag, this.instance),
      communities: [],
      owner: null,
    };
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
