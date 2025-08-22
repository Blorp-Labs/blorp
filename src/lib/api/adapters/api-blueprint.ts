import { PostFeatureType } from "lemmy-v4";
import z from "zod";

export const INIT_PAGE_TOKEN = "INIT_PAGE_TOKEN";

export const Errors = {
  MFA_REQUIRED: new Error("MFA_REQUIRED"),
  NOT_IMPLEMENTED: new Error("NOT_IMPLEMENTED"),
};

const communitySlug = z.string();

const personSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  apId: z.string(),
  avatar: z.string().nullable(),
  slug: z.string(),
  matrixUserId: z.string().nullable(),
  deleted: z.boolean(),
  isBot: z.boolean(),
  // PieFed sometimes sends these fields
  // depending on the endpoint
  bio: z.string().nullable().optional(),
  commentCount: z.number().nullable().optional(),
  postCount: z.number().nullable().optional(),
});
export const postSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  apId: z.string(),
  nsfw: z.boolean().nullable(),
  communitySlug,
  communityApId: z.string(),
  creatorId: z.number(),
  creatorApId: z.string(),
  creatorSlug: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  embedVideoUrl: z.string().nullable(),
  thumbnailAspectRatio: z.number().nullable(),
  downvotes: z.number(),
  upvotes: z.number(),
  commentsCount: z.number(),
  altText: z.string().optional(),
  url: z.string().nullable(),
  urlContentType: z.string().nullable(),
  removed: z.boolean(),
  optimisticRemoved: z.boolean().optional(),
  deleted: z.boolean(),
  optimisticDeleted: z.boolean().optional(),
  crossPosts: z
    .array(
      z.object({
        apId: z.string(),
        communitySlug,
      }),
    )
    .nullable(),
  myVote: z.number().optional(),
  optimisticMyVote: z.number().optional(),
  featuredCommunity: z.boolean(),
  optimisticFeaturedCommunity: z.boolean().optional(),
  featuredLocal: z.boolean(),
  optimisticFeaturedLocal: z.boolean().optional(),
  read: z.boolean(),
  optimisticRead: z.boolean().optional(),
  saved: z.boolean(),
  optimisticSaved: z.boolean().optional(),
});
const communitySchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  apId: z.string(),
  slug: communitySlug,
  icon: z.string().nullable(),
  description: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  usersActiveDayCount: z.number().optional(),
  usersActiveWeekCount: z.number().optional(),
  usersActiveMonthCount: z.number().optional(),
  usersActiveHalfYearCount: z.number().optional(),
  subscriberCount: z.number().optional(),
  subscribersLocalCount: z.number().optional(),
  postCount: z.number().optional(),
  commentCount: z.number().optional(),
  subscribed: z.enum(["Subscribed", "NotSubscribed", "Pending"]).optional(),
  optimisticSubscribed: z
    .enum(["Subscribed", "NotSubscribed", "Pending"])
    .optional(),
});
export const siteSchema = z.object({
  privateInstance: z.boolean(),
  instance: z.string(),
  description: z.string().nullable(),
  me: personSchema.nullable(),
  myEmail: z.string().nullable(),
  admins: z.array(personSchema),
  moderates: z.array(communitySchema).nullable(),
  follows: z.array(communitySchema).nullable(),
  personBlocks: z.array(personSchema).nullable(),
  communityBlocks: z.array(communitySchema).nullable(),
  version: z.string(),
  sidebar: z.string().nullable(),
  userCount: z.number().nullable(),
  usersActiveDayCount: z.number().nullable(),
  usersActiveWeekCount: z.number().nullable(),
  usersActiveMonthCount: z.number().nullable(),
  usersActiveHalfYearCount: z.number().nullable(),
  postCount: z.number().nullable(),
  commentCount: z.number().nullable(),
  icon: z.string().nullable(),
  title: z.string().nullable(),
  applicationQuestion: z.string().nullable(),
  registrationMode: z.enum(["Closed", "RequireApplication", "Open"]),
  showNsfw: z.boolean(),
  blurNsfw: z.boolean(),
  enablePostDownvotes: z.boolean(),
  enableCommentDownvotes: z.boolean(),
});
export const commentSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  apId: z.string(),
  path: z.string(),
  body: z.string(),
  creatorId: z.number(),
  creatorApId: z.string(),
  creatorSlug: z.string(),
  postId: z.number(),
  postApId: z.string(),
  downvotes: z.number(),
  upvotes: z.number(),
  myVote: z.number().nullable(),
  communitySlug,
  communityApId: z.string(),
  optimisticMyVote: z.number().optional(),
  removed: z.boolean(),
  optimisticRemoved: z.boolean().optional(),
  deleted: z.boolean(),
  optimisticDeleted: z.boolean().optional(),
  postTitle: z.string(),
  childCount: z.number(),
});
export const privateMessageSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  creatorId: z.number(),
  creatorApId: z.string(),
  creatorSlug: z.string(),
  recipientId: z.number(),
  recipientApId: z.string(),
  recipientSlug: z.string(),
  read: z.boolean(),
  body: z.string(),
});
export const replySchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  commentId: z.number(),
  body: z.string(),
  path: z.string(),
  creatorId: z.number(),
  creatorApId: z.string(),
  creatorSlug: z.string(),
  read: z.boolean(),
  postId: z.number(),
  postApId: z.string(),
  postName: z.string(),
  communitySlug,
  communityApId: z.string(),
});
export const mentionSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  commentId: z.number(),
  body: z.string(),
  path: z.string(),
  creatorId: z.number(),
  creatorApId: z.string(),
  creatorSlug: z.string(),
  read: z.boolean(),
  postId: z.number(),
  postApId: z.string(),
  postName: z.string(),
  communitySlug,
  communityApId: z.string(),
});
export const uploadImageResponseSchema = z.object({
  url: z.string().optional(),
});
export const captchaSchema = z.object({
  uuid: z.string(),
  audioUrl: z.string(),
  imgUrl: z.string(),
});
export const registrationResponseSchema = z.object({
  jwt: z.string().nullable(),
  verifyEmailSent: z.boolean().nullable(),
  registrationCreated: z.boolean().nullable(),
});

export const slugSchema = z.custom<`${string}@${string}`>((val) => {
  return /^([\w-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(val);
});

export const resolveObjectResponseSchema = z.object({
  post: postSchema.nullable(),
  community: communitySchema.nullable(),
  user: personSchema.nullable(),
});

export namespace Schemas {
  export type Site = z.infer<typeof siteSchema>;

  export type Post = z.infer<typeof postSchema>;

  export type Community = z.infer<typeof communitySchema>;
  export type Person = z.infer<typeof personSchema>;

  export type Comment = z.infer<typeof commentSchema>;

  export type PrivateMessage = z.infer<typeof privateMessageSchema>;

  export type Reply = z.infer<typeof replySchema>;
  export type Mention = z.infer<typeof mentionSchema>;

  export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;
  export type Captcha = z.infer<typeof captchaSchema>;
  export type Registration = z.infer<typeof registrationResponseSchema>;

  export type ResolveObject = z.infer<typeof resolveObjectResponseSchema>;
}

export namespace Forms {
  export type GetPerson = {
    apIdOrUsername: string;
  };

  export type GetPrivateMessages = {
    pageCursor?: string;
    unreadOnly?: boolean;
  };

  export type CreatePrivateMessage = {
    body: string;
    recipientId: number;
  };

  export type MarkPrivateMessageRead = {
    id: number;
    read: boolean;
  };

  export type GetPersonContent = {
    apIdOrUsername: string;
    pageCursor?: string;
    type: "Posts" | "Comments";
    sort?: string;
  };

  export type GetPosts = {
    showNsfw?: boolean;
    showRead?: boolean;
    sort?: string;
    pageCursor?: string;
    type?: "All" | "Local" | "Subscribed" | "ModeratorView";
    communitySlug?: string;
    savedOnly?: boolean;
  };

  export type MarkPostRead = {
    postIds: number[];
    read: boolean;
  };

  export type FeaturePost = {
    postId: number;
    featured: boolean;
    featureType: PostFeatureType;
  };

  export type SavePost = {
    postId: number;
    save: boolean;
  };

  export type DeletePost = {
    postId: number;
    deleted: boolean;
  };

  export type LikePost = {
    postId: number;
    score: 0 | 1 | -1;
  };

  export type Search = {
    q: string;
    communitySlug?: string;
    type: "Posts" | "Communities" | "Users" | "Comments";
    sort?: string;
    pageCursor?: string;
  };

  export type GetCommunity = {
    slug?: string;
  };

  export type GetCommunities = {
    sort?: string;
    type?: "All" | "Local" | "Subscribed" | "ModeratorView";
    pageCursor?: string;
  };

  export type FollowCommunity = {
    communityId: number;
    follow: boolean;
  };

  export type GetComments = {
    postApId?: string;
    parentId?: number;
    sort?: string;
    pageCursor?: string;
    savedOnly?: boolean;
    maxDepth?: number;
  };

  export type CreateComment = {
    postApId: string;
    body: string;
    parentId?: number;
  };

  export type LikeComment = {
    id: number;
    postId: number;
    score: number;
  };

  export type DeleteComment = {
    id: number;
    deleted: boolean;
  };

  export type EditComment = {
    id: number;
    body: string;
  };

  export type Login = {
    username: string;
    password: string;
    mfaCode?: string;
  };

  export type GetReplies = {
    pageCursor?: string;
    sort?: string;
    unreadOnly?: boolean;
  };

  export type MarkReplyRead = {
    id: number;
    read: boolean;
  };

  export type GetMentions = {
    pageCursor?: string;
    sort?: string;
    unreadOnly?: boolean;
  };

  export type MarkMentionRead = {
    id: number;
    read: boolean;
  };

  export interface EditPost
    extends Pick<
      Schemas.Post,
      "title" | "url" | "body" | "altText" | "thumbnailUrl" | "nsfw"
    > {
    apId: string;
  }
  export interface CreatePost
    extends Pick<
      Schemas.Post,
      | "title"
      | "url"
      | "body"
      | "altText"
      | "thumbnailUrl"
      | "communitySlug"
      | "nsfw"
    > {}

  export type CreatePostReport = {
    postId: number;
    reason: string;
  };

  export type CreateCommentReport = {
    commentId: number;
    reason: string;
  };

  export type BlockPerson = {
    personId: number;
    block: boolean;
  };

  export type BlockCommunity = {
    communityId: number;
    block: boolean;
  };

  export type UploadImage = {
    image: File;
  };

  export type Register = {
    username: string;
    password: string;
    repeatPassword: string;
    showNsfw?: boolean;
    email?: string;
    captchaUuid?: string;
    captchaAnswer?: string;
    answer?: string;
  };

  export type SaveUserSettings = {
    avatar?: File;
    banner?: File;
    bio?: string;
    displayName?: string;
    email?: string;
  };

  export type ResolveObject = {
    q: string;
  };
}

type Paginated = {
  nextCursor: string | null;
};

export type RequestOptions = {
  signal?: AbortSignal;
};

export abstract class ApiBlueprint<C, S extends string> {
  abstract client: C;
  abstract limit: number;

  abstract software: S;

  abstract getSite(options?: RequestOptions): Promise<Schemas.Site>;

  abstract getPost(
    form: { apId: string },
    options: RequestOptions,
  ): Promise<{
    post: Schemas.Post;
    community?: Schemas.Community;
    creator?: Schemas.Person;
  }>;
  abstract getPosts(
    form: Forms.GetPosts,
    options: RequestOptions,
  ): Promise<
    Paginated & {
      posts: {
        post: Schemas.Post;
        community?: Schemas.Community;
        creator?: Schemas.Person;
      }[];
    }
  >;

  abstract savePost(form: {
    postId: number;
    save: boolean;
  }): Promise<Schemas.Post>;

  abstract likePost(form: Forms.LikePost): Promise<Schemas.Post>;

  abstract markPostRead(form: Forms.MarkPostRead): Promise<void>;

  abstract deletePost(form: Forms.DeletePost): Promise<Schemas.Post>;

  abstract editPost(form: Forms.EditPost): Promise<Schemas.Post>;

  abstract featurePost(form: Forms.FeaturePost): Promise<Schemas.Post>;

  abstract getPersonContent(
    form: Forms.GetPersonContent,
    options: RequestOptions,
  ): Promise<{
    posts: Schemas.Post[];
    comments: Schemas.Comment[];
    nextCursor: string | null;
  }>;

  abstract search(
    form: Forms.Search,
    options: RequestOptions,
  ): Promise<{
    posts: Schemas.Post[];
    communities: Schemas.Community[];
    comments: Schemas.Comment[];
    users: Schemas.Person[];
    nextCursor: string | null;
  }>;

  abstract getCommunity(
    form: Forms.GetCommunity,
    options: RequestOptions,
  ): Promise<{
    community: Schemas.Community;
    mods: Schemas.Person[];
  }>;

  abstract getCommunities(
    form: Forms.GetCommunities,
    options: RequestOptions,
  ): Promise<{
    communities: Schemas.Community[];
    nextCursor: string | null;
  }>;

  abstract getPerson(
    form: Forms.GetPerson,
    options: RequestOptions,
  ): Promise<Schemas.Person>;

  abstract followCommunity(
    form: Forms.FollowCommunity,
  ): Promise<Schemas.Community>;

  abstract logout(): Promise<void>;

  abstract getComments(
    form: Forms.GetComments,
    options: RequestOptions,
  ): Promise<{
    comments: Schemas.Comment[];
    creators: Schemas.Person[];
    nextCursor: string | null;
  }>;

  abstract createComment(form: Forms.CreateComment): Promise<Schemas.Comment>;

  abstract likeComment(form: Forms.LikeComment): Promise<Schemas.Comment>;

  abstract deleteComment(form: Forms.DeleteComment): Promise<Schemas.Comment>;

  abstract editComment(form: Forms.EditComment): Promise<Schemas.Comment>;

  abstract login(form: Forms.Login): Promise<{ jwt: string }>;

  abstract getPrivateMessages(
    form: Forms.GetPrivateMessages,
    options: RequestOptions,
  ): Promise<{
    privateMessages: Schemas.PrivateMessage[];
    profiles: Schemas.Person[];
    nextCursor: string | null;
  }>;

  abstract createPrivateMessage(
    form: Forms.CreatePrivateMessage,
  ): Promise<Schemas.PrivateMessage>;

  abstract markPrivateMessageRead(
    form: Forms.MarkPrivateMessageRead,
  ): Promise<void>;

  abstract getReplies(
    form: Forms.GetReplies,
    option: RequestOptions,
  ): Promise<{
    replies: Schemas.Reply[];
    profiles: Schemas.Person[];
    nextCursor: string | null;
  }>;

  abstract getMentions(
    form: Forms.GetMentions,
    options: RequestOptions,
  ): Promise<{
    mentions: Schemas.Mention[];
    profiles: Schemas.Person[];
    nextCursor: string | null;
  }>;

  abstract markReplyRead(form: Forms.MarkReplyRead): Promise<void>;

  abstract markMentionRead(form: Forms.MarkMentionRead): Promise<void>;

  abstract createPost(form: Forms.CreatePost): Promise<Schemas.Post>;

  abstract createPostReport(form: Forms.CreatePostReport): Promise<void>;

  abstract createCommentReport(form: Forms.CreateCommentReport): Promise<void>;

  abstract blockPerson(form: Forms.BlockPerson): Promise<void>;

  abstract blockCommunity(form: Forms.BlockCommunity): Promise<void>;

  abstract uploadImage(
    form: Forms.UploadImage,
  ): Promise<Schemas.UploadImageResponse>;

  abstract getCaptcha(options: RequestOptions): Promise<Schemas.Captcha>;

  abstract register(form: Forms.Register): Promise<Schemas.Registration>;

  abstract saveUserSettings(form: Forms.SaveUserSettings): Promise<void>;

  abstract removeUserAvatar(): Promise<void>;

  abstract resolveObject(
    form: Forms.ResolveObject,
    options?: RequestOptions,
  ): Promise<Schemas.ResolveObject>;

  abstract getPostSorts(): readonly string[];
  abstract getCommentSorts(): readonly string[];
  abstract getCommunitySorts(): readonly string[];
}
