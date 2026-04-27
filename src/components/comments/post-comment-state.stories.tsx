import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostComment } from "./post-comment";
import type { CommentTree } from "@/src/lib/comment-tree";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { useCommentsStore } from "@/src/stores/comments";
import { waitForHydration } from "@/test-utils/storybook";

const creators = [
  api.getPerson({ id: 3001 }),
  api.getPerson({ id: 3002 }),
  api.getPerson({ id: 3003 }),
];

function c(i: number) {
  return creators[i % creators.length]!;
}

function makeTree(comment: ReturnType<typeof api.getComment>): CommentTree {
  return {
    comment,
    meta: { sort: 0, immediateChildren: 0, pruned: false, colorIndex: 0 },
    children: {},
  };
}

const deleted = api.getComment({
  id: 4001,
  path: "0.4001",
  body: "You won't see this.",
  deleted: true,
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

const removed = api.getComment({
  id: 4002,
  path: "0.4002",
  body: "You won't see this either.",
  removed: true,
  creatorId: c(1).id,
  creatorApId: c(1).apId,
  creatorHandle: c(1).handle,
});

const lockedPost = api.getComment({
  id: 4003,
  path: "0.4003",
  body: "The post is locked so this comment cannot be replied to.",
  creatorId: c(2).id,
  creatorApId: c(2).apId,
  creatorHandle: c(2).handle,
});

const postCreator = api.getComment({
  id: 4004,
  path: "0.4004",
  body: "This comment was written by the post's author — should show an OP badge.",
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

const mod = api.getComment({
  id: 4005,
  path: "0.4005",
  body: "This comment was written by a moderator — should show a mod badge.",
  creatorId: c(1).id,
  creatorApId: c(1).apId,
  creatorHandle: c(1).handle,
});

const highlighted = api.getComment({
  id: 4006,
  path: "0.4006",
  body: "This comment is highlighted, e.g. when navigating from a notification.",
  creatorId: c(2).id,
  creatorApId: c(2).apId,
  creatorHandle: c(2).handle,
});

const saved = api.getComment({
  id: 4007,
  path: "0.4007",
  body: "This comment has been saved by the user.",
  saved: true,
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

const upvoted = api.getComment({
  id: 4008,
  path: "0.4008",
  body: "The current user has upvoted this comment.",
  myVote: 1,
  upvotes: 42,
  creatorId: c(1).id,
  creatorApId: c(1).apId,
  creatorHandle: c(1).handle,
});

const downvoted = api.getComment({
  id: 4009,
  path: "0.4009",
  body: "The current user has downvoted this comment.",
  myVote: -1,
  downvotes: 3,
  creatorId: c(2).id,
  creatorApId: c(2).apId,
  creatorHandle: c(2).handle,
});

const answer = api.getComment({
  id: 4010,
  path: "0.4010",
  body: "This comment has been marked as the answer.",
  answer: true,
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

const standalone = api.getComment({
  id: 4011,
  path: "0.4011",
  body: "This comment is rendered in standalone mode, e.g. in an inbox notification.",
  creatorId: c(1).id,
  creatorApId: c(1).apId,
  creatorHandle: c(1).handle,
});

const singleThread = api.getComment({
  id: 4012,
  path: "0.4012",
  body: "This comment is rendered as the root of a single-comment thread view.",
  creatorId: c(2).id,
  creatorApId: c(2).apId,
  creatorHandle: c(2).handle,
});

const allComments = [
  deleted,
  removed,
  lockedPost,
  postCreator,
  mod,
  highlighted,
  saved,
  upvoted,
  downvoted,
  answer,
  standalone,
  singleThread,
];

const postApId = allComments[0]!.postApId;

async function loadData() {
  await waitForHydration(useAuth, useProfilesStore, useCommentsStore);
  const prefixer = useAuth.getState().getCachePrefixer();
  useProfilesStore.getState().cacheProfiles(prefixer, creators);
  useCommentsStore.getState().cacheComments(prefixer, allComments);
}

const meta: Meta<typeof PostComment> = {
  component: PostComment,
  loaders: [loadData],
};

export default meta;
type Story = StoryObj<typeof PostComment>;

export const Deleted: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(deleted) },
};

export const Removed: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(removed) },
};

export const LockedPost: Story = {
  args: {
    postApId,
    postLocked: true,
    commentTree: makeTree(lockedPost),
  },
};

export const PostCreator: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(postCreator),
    postCreatorId: c(0).id,
  },
};

export const Mod: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(mod),
    modApIds: [c(1).apId],
    canMod: true,
  },
};

export const Highlighted: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(highlighted),
    highlightCommentId: highlighted.id,
  },
};

export const Saved: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(saved) },
};

export const Upvoted: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(upvoted) },
};

export const Downvoted: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(downvoted) },
};

export const Answer: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(answer) },
};

export const Standalone: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(standalone),
    standalone: true,
  },
};

export const SingleCommentThread: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(singleThread),
    singleCommentThread: true,
  },
};
