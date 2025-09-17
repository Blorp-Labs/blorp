import { z } from "zod";
import { buildRoute } from "./utils";

const communityNameSchema = z.object({
  communityName: z.string(),
});

const postCommentSchema = z.object({
  communityName: z.string(),
  post: z.string(),
  comment: z.string().optional(),
});

const userSchema = z.object({
  userId: z.string(),
});
const searchSchema = z.object({
  communityName: z.string().optional(),
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
  communityName: z.string().optional(),
});

export const routeDefs = {
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
  ...buildRoute("/home/c/:communityName", communityNameSchema),
  ...buildRoute("/home/c/:communityName/s", searchSchema),
  ...buildRoute("/home/c/:communityName/sidebar", communityNameSchema),
  ...buildRoute("/home/c/:communityName/posts/:post", postCommentSchema),
  ...buildRoute("/home/lightbox", lightBoxFeedSchema),
  ...buildRoute("/home/c/:communityName/lightbox", lightBoxFeedSchema),
  ...buildRoute("/home/lightbox/:imgUrl", lightBoxSchema),
  ...buildRoute(
    "/home/c/:communityName/posts/:post/comments/:comment",
    postCommentSchema,
  ),
  ...buildRoute("/home/u/:userId", userSchema),
  ...buildRoute("/home/saved"),
  // Communities
  ...buildRoute("/communities"),
  ...buildRoute("/communities/*"),
  ...buildRoute("/communities/s"),
  ...buildRoute("/communities/sidebar"),
  ...buildRoute("/communities/c/:communityName", communityNameSchema),
  ...buildRoute("/communities/c/:communityName/s", searchSchema),
  ...buildRoute("/communities/c/:communityName/sidebar", communityNameSchema),
  ...buildRoute("/communities/c/:communityName/posts/:post", postCommentSchema),
  ...buildRoute(
    "/communities/c/:communityName/posts/:post/comments/:comment",
    postCommentSchema,
  ),
  ...buildRoute("/communities/u/:userId", userSchema),
  ...buildRoute("/communities/saved"),
  ...buildRoute("/communities/c/:communityName/lightbox", lightBoxFeedSchema),
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
  ...buildRoute("/inbox/c/:communityName", communityNameSchema),
  ...buildRoute("/inbox/c/:communityName/s", searchSchema),
  ...buildRoute("/inbox/c/:communityName/sidebar", communityNameSchema),
  ...buildRoute("/inbox/c/:communityName/posts/:post", postCommentSchema),
  ...buildRoute(
    "/inbox/c/:communityName/posts/:post/comments/:comment",
    postCommentSchema,
  ),
  ...buildRoute("/inbox/u/:userId", userSchema),
  ...buildRoute("/inbox/saved"),
  ...buildRoute("/inbox/c/:communityName/lightbox", lightBoxFeedSchema),
  ...buildRoute("/inbox/lightbox/:imgUrl", lightBoxSchema),
  // Create
  ...buildRoute("/create"),
  ...buildRoute("/create/*"),
  // Settings
  ...buildRoute("/settings"),
  ...buildRoute("/settings/manage-blocks/:index", manageAccountSchema),
  ...buildRoute("/settings/update-profile/:index", manageAccountSchema),
  ...buildRoute("/settings/*"),
  // Other
  ...buildRoute("/download"),
  ...buildRoute("/support"),
  ...buildRoute("/privacy"),
  ...buildRoute("/terms"),
  ...buildRoute("/csae"),
  ...buildRoute("/licenses"),
} as const;

export type RouteDefs = typeof routeDefs;
export type RoutePath = RouteDefs[keyof RouteDefs]["path"];
