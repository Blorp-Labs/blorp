import type { Meta, StoryObj } from "@storybook/react-vite";

import { VirtualList } from "./virtual-list";
import { PostCard } from "./posts/post";
import * as api from "@/test-utils/api";
import { useAuth } from "../stores/auth";
import { usePostsStore } from "../stores/posts";
import { useEffect, useState } from "react";
import { usePagination } from "../lib/hooks/use-pagination";

// 50 posts for the basic feed stories
const POST_FEED = Array.from({ length: 50 }).map((_i, index) =>
  api.getPost({
    variant: index % 2 === 0 ? "text" : "image",
    post: {
      id: api.randomDbId(),
    },
  }),
);

const PAGE_SIZE = 5;

// 5 pages × PAGE_SIZE posts each for the pagination story
const PAGES = Array.from({ length: 10 }, (_, i) =>
  Array.from({ length: PAGE_SIZE }, (_, j) =>
    api.getPost({
      variant: j % 2 === 0 ? "text" : "image",
      post: {
        id: api.randomDbId(),
        title: `This is a test post ${i * PAGE_SIZE + (j + 1)}`,
      },
    }),
  ),
);
const ALL_PAGED_POSTS = PAGES.flat();

function LoadData() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cachePosts = usePostsStore((s) => s.cachePosts);

  useEffect(() => {
    cachePosts(getCachePrefixer(), [
      ...POST_FEED.map((p) => p.post),
      ...ALL_PAGED_POSTS.map((p) => p.post),
    ]);
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
    renderItem: ({ item }) => (
      <div className="md:px-2">
        <PostCard apId={item as string} />
      </div>
    ),
    numPlaceholders: 200,
    estimatedItemSize: 24,
  },
};

export const NoItems: Story = {
  args: {
    className: "h-[500px]",
    data: [],
    noItems: true,
    noItemsComponent: (
      <div className="flex-1 italic text-muted-foreground p-6 text-center">
        Nothing to see here
      </div>
    ),
    renderItem: () => null,
    estimatedItemSize: 24,
  },
};

type MockPage = { posts: string[] };

function PaginatedFeed() {
  const [fetchedPageCount, setFetchedPageCount] = useState(1);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const pages: MockPage[] = PAGES.slice(0, fetchedPageCount).map((posts) => ({
    posts: posts.map((p) => p.post.apId),
  }));

  const hasNextPage = fetchedPageCount < PAGES.length;

  const fetchNextPage = () => {
    setIsFetchingNextPage(true);
    setTimeout(() => {
      setFetchedPageCount((c) => c + 1);
      setIsFetchingNextPage(false);
    }, 800);
  };

  const { flatData, paginationControls, onEndReached } = usePagination({
    pages,
    getItems: (p) => p.posts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    mode: "pages",
    listKey: "storybook-pages",
  });

  return (
    <VirtualList
      className="h-[500px]"
      data={flatData}
      renderItem={({ item }) => (
        <div className="md:px-2">
          <PostCard apId={item as string} />
        </div>
      )}
      estimatedItemSize={450}
      paginationControls={paginationControls}
      onEndReached={onEndReached}
      scrollHost
    />
  );
}

export const Pages: Story = {
  render: () => <PaginatedFeed />,
};
