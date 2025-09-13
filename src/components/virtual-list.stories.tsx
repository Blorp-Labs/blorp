import type { Meta, StoryObj } from "@storybook/react-vite";

import { VirtualList } from "./virtual-list";
import { PostCard } from "./posts/post";
import * as api from "@/test-utils/api";
import _ from "lodash";
import { useAuth } from "../stores/auth";
import { usePostsStore } from "../stores/posts";
import { useEffect } from "react";

const POST_FEED = Array.from({ length: 50 }).map((_i, index) =>
  api.getPost({
    variant: index % 2 === 0 ? "text" : "image",
    post: {
      id: api.randomDbId(),
    },
  }),
);

function LoadData() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cachePosts = usePostsStore((s) => s.cachePosts);

  useEffect(() => {
    cachePosts(
      getCachePrefixer(),
      POST_FEED.map((p) => p.post),
    );
  }, [getCachePrefixer, cachePosts]);

  return null;
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof VirtualList> = {
  component: VirtualList,
  decorators: (Story) => (
    <>
      <LoadData />
      <Story />
    </>
  ),
};

export default meta;
type Story = StoryObj<typeof VirtualList>;

export const Placeholder: Story = {
  args: {
    className: "h-[500px]",
    data: [],
    placeholder: <div className="flex-1 bg-muted mb-2">Placeholder</div>,
    numPlaceholders: 200,
    estimatedItemSize: 24,
  },
};

export const PostFeed: Story = {
  args: {
    className: "h-[500px]",
    data: POST_FEED.map((p) => p.post.apId),
    renderItem: ({ item }) => <PostCard apId={item as string} />,
    numPlaceholders: 200,
    estimatedItemSize: 24,
  },
};
