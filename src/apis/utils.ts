import { Schemas } from "./api-blueprint";
import _ from "lodash";
import z from "zod";

export {
  createHandle,
  parseHandle,
  apIdFromCommunityHandle,
} from "../lib/handle";
export type { Handle } from "../lib/handle";

export function encodeApId(id: string) {
  return encodeURIComponent(id);
}

export function decodeApId(encodedUrl: string) {
  return decodeURIComponent(encodedUrl);
}

export const encodedApIdSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return decodeApId(val);
  }
  return val;
}, z.string().url());

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
    "handle",
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
  return _.pick(community, [
    "createdAt",
    "id",
    "apId",
    "handle",
    "icon",
    "nsfw",
  ]);
}

export function commentIsAnswer(comment: Schemas.Comment | undefined) {
  if (!comment) {
    return false;
  }
  return comment.optimisticAnswer ?? comment.answer;
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

export function getFlairLookup(flairs?: Schemas.Flair[] | null) {
  if (!flairs) {
    return () => undefined;
  }
  const flairsById = _.keyBy(flairs, "id");
  const flairsByTitle = _.keyBy(flairs, "title");
  const flairsByApId = _.keyBy(
    flairs.filter((f) => f.apId),
    "apId",
  );
  return ({ apId, title, id }: Partial<Schemas.Flair>) => {
    if (apId && flairsByApId[apId]) {
      return flairsByApId[apId];
    }
    if (id && flairsById[id]) {
      return flairsById[id];
    }
    if (title && flairsByTitle[title]) {
      return flairsByTitle[title];
    }
  };
}
