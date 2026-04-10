import { z } from "zod";
import { buildRoute } from "./utils";

const feedApIdSchema = z.object({
  apId: z.string(),
});

const communityHandleSchema = z.object({
  communityHandle: z.string(),
});

const postCommentSchema = z.object({
  communityHandle: z.string(),
  post: z.string(),
  comment: z.string().optional(),
});

const postSchema = z.object({
  post: z.string(),
  comment: z.string().optional(),
});

const userSchema = z.object({
  userId: z.string(),
});
const searchSchema = z.object({
  communityHandle: z.string().optional(),
});
const manageAccountSchema = z.object({
  index: z.string(),
});
const idSchema = z.object({
  id: z.string(),
});
const lightBoxSchema = z.object({
  imgUrl: z.string(),
});

const lightBoxFeedSchema = z.object({
  communityHandle: z.string().optional(),
});

export const routeDefs = {
  ...buildRoute("/debug"),
  ...buildRoute("/instance"),
  // activity pub resolver
  ...buildRoute("/post/:id", idSchema),
  ...buildRoute("/user/:id", idSchema),
  ...buildRoute("/c/:id", idSchema),
  // Home
  ...buildRoute("/home"),
  ...buildRoute("/home/*"),
  ...buildRoute("/home/s"),
  ...buildRoute("/home/sidebar"),
  ...buildRoute("/home/f/:apId", feedApIdSchema),
  ...buildRoute("/home/f/:apId/sidebar", feedApIdSchema),
  ...buildRoute("/home/c/:communityHandle", communityHandleSchema),
  ...buildRoute("/home/c/:communityHandle/s", searchSchema),
  ...buildRoute("/home/c/:communityHandle/sidebar", communityHandleSchema),
  ...buildRoute("/home/c/:communityHandle/modlog", communityHandleSchema),
  ...buildRoute("/home/modlog"),
  ...buildRoute("/home/c/:communityHandle/posts/:post", postCommentSchema),
  ...buildRoute("/home/posts/:post", postSchema),
  ...buildRoute("/home/lightbox", lightBoxFeedSchema),
  ...buildRoute("/home/c/:communityHandle/lightbox", lightBoxFeedSchema),
  ...buildRoute("/home/lightbox/:imgUrl", lightBoxSchema),
  ...buildRoute(
    "/home/c/:communityHandle/posts/:post/comments/:comment",
    postCommentSchema,
  ),
  ...buildRoute("/home/posts/:post/comments/:comment", postSchema),
  ...buildRoute("/home/u/:userId", userSchema),
  ...buildRoute("/home/saved"),
  // Communities
  ...buildRoute("/communities"),
  ...buildRoute("/communities/sort/:sort", z.object({ sort: z.string() })),
  ...buildRoute("/communities/*"),
  ...buildRoute("/communities/s"),
  ...buildRoute("/communities/sidebar"),
  ...buildRoute("/communities/f/:apId", feedApIdSchema),
  ...buildRoute("/communities/f/:apId/sidebar", feedApIdSchema),
  ...buildRoute("/communities/c/:communityHandle", communityHandleSchema),
  ...buildRoute("/communities/c/:communityHandle/s", searchSchema),
  ...buildRoute(
    "/communities/c/:communityHandle/sidebar",
    communityHandleSchema,
  ),
  ...buildRoute(
    "/communities/c/:communityHandle/modlog",
    communityHandleSchema,
  ),
  ...buildRoute("/communities/modlog"),
  ...buildRoute(
    "/communities/c/:communityHandle/posts/:post",
    postCommentSchema,
  ),
  ...buildRoute("/communities/posts/:post", postSchema),
  ...buildRoute(
    "/communities/c/:communityHandle/posts/:post/comments/:comment",
    postCommentSchema,
  ),
  ...buildRoute("/communities/posts/:post/comments/:comment", postSchema),
  ...buildRoute("/communities/u/:userId", userSchema),
  ...buildRoute("/communities/saved"),
  ...buildRoute("/communities/c/:communityHandle/lightbox", lightBoxFeedSchema),
  ...buildRoute("/communities/lightbox/:imgUrl", lightBoxSchema),
  // Messages
  ...buildRoute("/messages/*"),
  ...buildRoute("/messages"),
  ...buildRoute("/messages/chat/:userId", userSchema),
  // Inbox
  ...buildRoute("/inbox"),
  ...buildRoute("/inbox/*"),
  ...buildRoute("/inbox/s"),
  ...buildRoute("/inbox/sidebar"),
  ...buildRoute("/inbox/f/:apId", feedApIdSchema),
  ...buildRoute("/inbox/f/:apId/sidebar", feedApIdSchema),
  ...buildRoute("/inbox/c/:communityHandle", communityHandleSchema),
  ...buildRoute("/inbox/c/:communityHandle/s", searchSchema),
  ...buildRoute("/inbox/c/:communityHandle/sidebar", communityHandleSchema),
  ...buildRoute("/inbox/c/:communityHandle/modlog", communityHandleSchema),
  ...buildRoute("/inbox/modlog"),
  ...buildRoute("/inbox/c/:communityHandle/posts/:post", postCommentSchema),
  ...buildRoute("/inbox/posts/:post", postSchema),
  ...buildRoute(
    "/inbox/c/:communityHandle/posts/:post/comments/:comment",
    postCommentSchema,
  ),
  ...buildRoute("/inbox/posts/:post/comments/:comment", postSchema),
  ...buildRoute("/inbox/u/:userId", userSchema),
  ...buildRoute("/inbox/saved"),
  ...buildRoute("/inbox/c/:communityHandle/lightbox", lightBoxFeedSchema),
  ...buildRoute("/inbox/lightbox/:imgUrl", lightBoxSchema),
  // Create
  ...buildRoute("/create_post"),
  ...buildRoute("/create_post/*"),
  // Settings
  ...buildRoute("/settings"),
  ...buildRoute("/settings/manage-blocks/:index", manageAccountSchema),
  ...buildRoute("/settings/update-profile/:index", manageAccountSchema),
  ...buildRoute("/settings/*"),
  // Other
  ...buildRoute("/support"),
  ...buildRoute("/privacy"),
  ...buildRoute("/terms"),
  ...buildRoute("/csae"),
} as const;

export type RouteDefs = typeof routeDefs;
export type RoutePath = RouteDefs[keyof RouteDefs]["path"];

export const STACK_ROOT_PATHS: RoutePath[] = [
  "/home",
  "/communities",
  "/inbox",
  "/create_post",
  "/messages",
];
