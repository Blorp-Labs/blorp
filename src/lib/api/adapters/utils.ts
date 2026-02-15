import { Schemas } from "./api-blueprint";
import _ from "lodash";

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
  return _.pick(community, ["createdAt", "id", "apId", "slug", "icon"]);
}

export function commentIsAnswer(comment: Schemas.Comment | undefined) {
  if (!comment) {
    return false;
  }
  return comment.optimisticAnswer ?? comment.answer;
}

export function apIdFromCommunitySlug(slug: string): string | undefined {
  const parts = slug.split("@");
  if (parts.length !== 2) return undefined;
  const [name, host] = parts;
  if (!name || !host) return undefined;
  return `https://${host}/c/${name}`;
}

export function getCommentEmojiReaction(comment: Schemas.Comment | undefined) {
  if (!comment) {
    return null;
  }
  return comment.optimisticMyEmojiReaction ?? comment.myEmojiReaction;
}

export function getPostEmojiReaction(post: Schemas.Post | undefined) {
  if (!post) return null;
  return post.optimisticMyEmojiReaction ?? post.myEmojiReaction;
}

export function getCommentMyVote(comment: Schemas.Comment) {
  return comment.optimisticMyVote ?? comment.myVote;
}
