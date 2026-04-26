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

const parentMissingMiddleChildTree = buildCommentTree(
  [parentMissingMiddleChildParent, parentMissingMiddleChildChild],
  { getCommentPageCursor: () => 0 },
);

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

const childOnDifferentPageTree = buildCommentTree(
  [childOnDifferentPageParent, childOnDifferentPageChild],
  {
    getCommentPageCursor: (c) => (c.id === childOnDifferentPageChildId ? 1 : 0),
  },
);

// — MixedPrunedAndVisible —
// Parent has two direct children: one on the same page (shown), one on a
// different page (pruned). Parent should be marked pruned: true.

const mixedParentId = 4001;
const mixedVisibleChildId = 4002;
const mixedPrunedChildId = 4003;

const mixedParent = api.getComment({
  id: mixedParentId,
  path: `0.${mixedParentId}`,
  body: "This parent has one visible child and one pruned child.",
  childCount: 2,
  creatorId: creators[0]!.id,
  creatorApId: creators[0]!.apId,
  creatorHandle: creators[0]!.handle,
});

const mixedVisibleChild = api.getComment({
  id: mixedVisibleChildId,
  postId: mixedParent.postId,
  path: `0.${mixedParentId}.${mixedVisibleChildId}`,
  body: "This child is on the same page as the parent — it is visible.",
  childCount: 0,
  creatorId: creators[1]!.id,
  creatorApId: creators[1]!.apId,
  creatorHandle: creators[1]!.handle,
});

const mixedPrunedChild = api.getComment({
  id: mixedPrunedChildId,
  postId: mixedParent.postId,
  path: `0.${mixedParentId}.${mixedPrunedChildId}`,
  body: "This child is on a different page — it is pruned.",
  childCount: 0,
  creatorId: creators[2]!.id,
  creatorApId: creators[2]!.apId,
  creatorHandle: creators[2]!.handle,
});

const mixedPrunedAndVisibleTree = buildCommentTree(
  [mixedParent, mixedVisibleChild, mixedPrunedChild],
  {
    getCommentPageCursor: (c) => (c.id === mixedPrunedChildId ? 1 : 0),
  },
);

// — MaxDepth —
// A 7-level deep chain. The 7th level is cut off by maxDepth=6, leaving the
// 6th level with immediateChildren > 0 to indicate more exist.

const maxDepthComments = [
  api.getComment({
    id: 2010,
    path: "0.2010",
    body: "Depth 1.",
    childCount: 1,
    creatorId: creators[0]!.id,
    creatorApId: creators[0]!.apId,
    creatorHandle: creators[0]!.handle,
  }),
  api.getComment({
    id: 2011,
    path: "0.2010.2011",
    body: "Depth 2.",
    childCount: 1,
    creatorId: creators[1]!.id,
    creatorApId: creators[1]!.apId,
    creatorHandle: creators[1]!.handle,
  }),
  api.getComment({
    id: 2012,
    path: "0.2010.2011.2012",
    body: "Depth 3.",
    childCount: 1,
    creatorId: creators[2]!.id,
    creatorApId: creators[2]!.apId,
    creatorHandle: creators[2]!.handle,
  }),
  api.getComment({
    id: 2013,
    path: "0.2010.2011.2012.2013",
    body: "Depth 4.",
    childCount: 1,
    creatorId: creators[3]!.id,
    creatorApId: creators[3]!.apId,
    creatorHandle: creators[3]!.handle,
  }),
  api.getComment({
    id: 2014,
    path: "0.2010.2011.2012.2013.2014",
    body: "Depth 5.",
    childCount: 1,
    creatorId: creators[0]!.id,
    creatorApId: creators[0]!.apId,
    creatorHandle: creators[0]!.handle,
  }),
  api.getComment({
    id: 2015,
    path: "0.2010.2011.2012.2013.2014.2015",
    body: "Depth 6 — the last visible level.",
    childCount: 1,
    creatorId: creators[1]!.id,
    creatorApId: creators[1]!.apId,
    creatorHandle: creators[1]!.handle,
  }),
  // Depth 7 — cut off by maxDepth=6, never added to the tree
  api.getComment({
    id: 2016,
    path: "0.2010.2011.2012.2013.2014.2015.2016",
    body: "Depth 7 — cut off.",
    childCount: 0,
    creatorId: creators[2]!.id,
    creatorApId: creators[2]!.apId,
    creatorHandle: creators[2]!.handle,
  }),
];

const maxDepthTree = buildCommentTree(maxDepthComments, {
  getCommentPageCursor: () => 0,
});

// —

async function loadData() {
  await waitForHydration(useAuth, useProfilesStore, useCommentsStore);
  const prefixer = useAuth.getState().getCachePrefixer();
  useProfilesStore.getState().cacheProfiles(prefixer, creators);
  useCommentsStore
    .getState()
    .cacheComments(prefixer, [
      parentMissingMiddleChildParent,
      parentMissingMiddleChildChild,
      childOnDifferentPageParent,
      childOnDifferentPageChild,
      mixedParent,
      mixedVisibleChild,
      mixedPrunedChild,
      ...maxDepthComments,
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
      parentMissingMiddleChildTree.children[parentMissingMiddleChildParentId]!,
    level: 0,
  },
};

export const ChildOnDifferentPage: Story = {
  args: {
    postApId: childOnDifferentPageParent.postApId,
    postLocked: false,
    commentTree:
      childOnDifferentPageTree.children[childOnDifferentPageParentId]!,
    level: 0,
  },
};

export const MixedPrunedAndVisible: Story = {
  args: {
    postApId: mixedParent.postApId,
    postLocked: false,
    commentTree: mixedPrunedAndVisibleTree.children[mixedParentId]!,
    level: 0,
  },
};

export const MaxDepth: Story = {
  args: {
    postApId: maxDepthComments[0]!.postApId,
    postLocked: false,
    commentTree: maxDepthTree.children[2010]!,
    level: 0,
  },
};
