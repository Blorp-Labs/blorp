import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostComment } from "./post-comment";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { useCommentsStore } from "@/src/stores/comments";
import { waitForHydration } from "@/test-utils/storybook";
import { buildCommentTree } from "@/src/lib/comment-tree";

const creators = [
  api.getPerson({ id: 1001 }),
  api.getPerson({ id: 1002 }),
  api.getPerson({ id: 1003 }),
  api.getPerson({ id: 1004 }),
];

// — ParentMissingMiddleChild —

const parentMissingMiddleChildParentId = 2001;
const parentMissingMiddleChildParent = api.getComment({
  id: parentMissingMiddleChildParentId,
  path: `0.${parentMissingMiddleChildParentId}`,
  body: "This is the parent comment.",
  childCount: 2,
  creatorId: creators[0]!.id,
  creatorApId: creators[0]!.apId,
  creatorHandle: creators[0]!.handle,
});

const parentMissingMiddleChildMiddleId = 2002;

const parentMissingMiddleChildChildId = 2003;
const parentMissingMiddleChildChild = api.getComment({
  id: parentMissingMiddleChildChildId,
  postId: parentMissingMiddleChildParent.postId,
  path: `0.${parentMissingMiddleChildParentId}.${parentMissingMiddleChildMiddleId}.${parentMissingMiddleChildChildId}`,
  body: "This is the child comment, nested under a missing middle comment.",
  childCount: 0,
  creatorId: creators[1]!.id,
  creatorApId: creators[1]!.apId,
  creatorHandle: creators[1]!.handle,
});

const parentMissingMiddleChildTree = buildCommentTree([
  { ...parentMissingMiddleChildParent, pageCursor: 0 },
  { ...parentMissingMiddleChildChild, pageCursor: 0 },
]);

// — ChildOnDifferentPage —

const childOnDifferentPageParentId = 3001;
const childOnDifferentPageParent = api.getComment({
  id: childOnDifferentPageParentId,
  path: `0.${childOnDifferentPageParentId}`,
  body: "This is the parent comment. Its child was loaded on a different page.",
  childCount: 1,
  creatorId: creators[2]!.id,
  creatorApId: creators[2]!.apId,
  creatorHandle: creators[2]!.handle,
});

const childOnDifferentPageChildId = 3002;
const childOnDifferentPageChild = api.getComment({
  id: childOnDifferentPageChildId,
  postId: childOnDifferentPageParent.postId,
  path: `0.${childOnDifferentPageParentId}.${childOnDifferentPageChildId}`,
  body: "This child was fetched on page 2 and should be pruned.",
  childCount: 0,
  creatorId: creators[3]!.id,
  creatorApId: creators[3]!.apId,
  creatorHandle: creators[3]!.handle,
});

const childOnDifferentPageTree = buildCommentTree([
  { ...childOnDifferentPageParent, pageCursor: 0 },
  { ...childOnDifferentPageChild, pageCursor: 1 },
]);

// —

async function loadData() {
  await waitForHydration(useAuth, useProfilesStore, useCommentsStore);
  useAuth.getState().updateSelectedAccount({
    site: api.getSite(),
    jwt: "story-jwt",
  });
  const prefixer = useAuth.getState().getCachePrefixer();
  useProfilesStore.getState().cacheProfiles(prefixer, creators);
  useCommentsStore
    .getState()
    .cacheComments(prefixer, [
      parentMissingMiddleChildParent,
      parentMissingMiddleChildChild,
      childOnDifferentPageParent,
      childOnDifferentPageChild,
    ]);
}

const meta: Meta<typeof PostComment> = {
  component: PostComment,
  loaders: [loadData],
};

export default meta;
type Story = StoryObj<typeof PostComment>;

export const ParentMissingMiddleChild: Story = {
  args: {
    postApId: parentMissingMiddleChildParent.postApId,
    postLocked: false,
    commentTree:
      parentMissingMiddleChildTree[parentMissingMiddleChildParentId]!,
    level: 0,
  },
};

export const ChildOnDifferentPage: Story = {
  args: {
    postApId: childOnDifferentPageParent.postApId,
    postLocked: false,
    commentTree: childOnDifferentPageTree[childOnDifferentPageParentId]!,
    level: 0,
  },
};
