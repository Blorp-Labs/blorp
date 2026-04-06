import { Schemas } from "./api-blueprint";
import _ from "lodash";

export type Slug = {
  name: string;
  host: string;
  slug: string;
};

export function createSlug({
  apId,
  name,
}: {
  apId: string;
  name: string;
}): Slug {
  const url = new URL(apId);
  if (!name) {
    throw new Error("invalid url for slug, apId=" + apId);
  }
  const host = url.host;
  return {
    name,
    host,
    slug: `${name}@${host}`,
  } satisfies Slug;
}

export function parseSlug(slug?: string) {
  const parsed = slug?.split("@");
  return {
    name: parsed?.[0],
    host: parsed?.[1],
  };
}

export function encodeApId(id: string) {
  return encodeURIComponent(id);
}

export function decodeApId(encodedUrl: string) {
  return decodeURIComponent(encodedUrl);
}

export const lemmyTimestamp = () => new Date().toISOString();

export function extractErrorContent(err: Error) {
  const content = err.message || err.name;
  return content ? _.capitalize(content.replaceAll("_", " ")) : "Unknown error";
}

/**
 * Remove optional fields that we don't really care about for blocked persons
 */
export function shrinkBlockedPerson(person: Schemas.Person): Schemas.Person {
  return _.pick(person, [
    "createdAt",
    "id",
    "apId",
    "slug",
    "deleted",
    "isBot",
    "isBanned",
    "avatar",
    "matrixUserId",
  ]);
}

/**
 * Remove optional fields that we don't really care about for blocked persons
 */
export function shrinkBlockedCommunity(
  community: Schemas.Community,
): Schemas.Community {
  return _.pick(community, ["createdAt", "id", "apId", "slug", "icon", "nsfw"]);
}

export function commentIsAnswer(comment: Schemas.Comment | undefined) {
  if (!comment) {
    return false;
  }
  return comment.optimisticAnswer ?? comment.answer;
}

export function apIdFromCommunitySlug(slug: string): string | undefined {
  const parts = slug.split("@");
  if (parts.length !== 2) {
    return undefined;
  }
  const [name, host] = parts;
  if (!name || !host) {
    return undefined;
  }
  return `https://${host}/c/${name}`;
}

export function getPostEmojiReactions(post: Schemas.Post) {
  const reactions = post.emojiReactions;
  const optimistic = post.optimisticMyEmojiReaction;
  if (!optimistic) {
    return reactions;
  }
  if (reactions.some((r) => r.token === optimistic)) {
    return reactions;
  }
  return [...reactions, { token: optimistic, count: 1 }];
}

export function getCommentEmojiReactions(comment: Schemas.Comment) {
  const reactions = comment.emojiReactions;
  const optimistic = comment.optimisticMyEmojiReaction;
  if (!optimistic) {
    return reactions;
  }
  if (reactions.some((r) => r.token === optimistic)) {
    return reactions;
  }
  return [...reactions, { token: optimistic, count: 1 }];
}

export function getCommentMyVote(comment: Schemas.Comment) {
  return comment.optimisticMyVote ?? comment.myVote;
}

export function getPostMyVote(post: Schemas.Post) {
  return post.optimisticMyVote ?? post.myVote;
}

export function getCommentSaved(comment: Schemas.Comment) {
  return comment.optimisticSaved ?? comment.saved;
}

export function getPostSaved(post: Schemas.Post) {
  return post.optimisticSaved ?? post.saved;
}

export function getFeedSubscribed(feed: Schemas.MultiCommunityFeed) {
  return (
    feed.optimisticSubscribed ??
    (feed.subscribed ? "Subscribed" : "NotSubscribed")
  );
}
