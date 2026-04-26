import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostComment } from "./post-comment";
import type { CommentTree } from "@/src/lib/comment-tree";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { useCommentsStore } from "@/src/stores/comments";
import { waitForHydration } from "@/test-utils/storybook";

const creators = [api.getPerson({ id: 5001 }), api.getPerson({ id: 5002 })];

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

// Long unbroken string — stress-tests word-break / overflow clipping
const longUnbrokenBody = api.getComment({
  id: 6001,
  path: "0.6001",
  body: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

// Long realistic body — stress-tests line-height and scroll behavior
const longRealisticBody = api.getComment({
  id: 6002,
  path: "0.6002",
  body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  creatorId: c(1).id,
  creatorApId: c(1).apId,
  creatorHandle: c(1).handle,
});

// Rich markdown — stress-tests the markdown renderer
const richMarkdown = api.getComment({
  id: 6003,
  path: "0.6003",
  body: `## Heading

Some **bold** and _italic_ and ~~strikethrough~~ text.

- Item one
- Item two
  - Nested item
- Item three

1. First
2. Second
3. Third

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

> A blockquote with some text inside it that might wrap to multiple lines.

Inline \`code\` and a [link](https://example.com).`,
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

// Emoji reactions
const emojiReactions = api.getComment({
  id: 6004,
  path: "0.6004",
  body: "This comment has a few emoji reactions.",
  emojiReactions: [
    { token: "👍", count: 12 },
    { token: "❤️", count: 5 },
    { token: "😂", count: 3 },
  ],
  creatorId: c(1).id,
  creatorApId: c(1).apId,
  creatorHandle: c(1).handle,
});

// Many emoji reactions — stress-tests reaction row wrapping
const manyEmojiReactions = api.getComment({
  id: 6005,
  path: "0.6005",
  body: "This comment has many emoji reactions.",
  emojiReactions: [
    { token: "👍", count: 99 },
    { token: "❤️", count: 87 },
    { token: "😂", count: 76 },
    { token: "😮", count: 65 },
    { token: "😢", count: 54 },
    { token: "🔥", count: 43 },
    { token: "🎉", count: 32 },
    { token: "🤔", count: 21 },
    { token: "👀", count: 10 },
    { token: "💯", count: 9 },
  ],
  creatorId: c(0).id,
  creatorApId: c(0).apId,
  creatorHandle: c(0).handle,
});

const allComments = [
  longUnbrokenBody,
  longRealisticBody,
  richMarkdown,
  emojiReactions,
  manyEmojiReactions,
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

export const LongUnbrokenBody: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(longUnbrokenBody),
  },
};

export const LongRealisticBody: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(longRealisticBody),
  },
};

export const RichMarkdown: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(richMarkdown) },
};

export const EmojiReactions: Story = {
  args: { postApId, postLocked: false, commentTree: makeTree(emojiReactions) },
};

export const ManyEmojiReactions: Story = {
  args: {
    postApId,
    postLocked: false,
    commentTree: makeTree(manyEmojiReactions),
  },
};
