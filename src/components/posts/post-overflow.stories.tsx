import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostCard } from "./post";
import * as api from "@/test-utils/api";
import { usePostsStore } from "@/src/stores/posts";
import { useEffect } from "react";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { useFlairsStore } from "@/src/stores/flairs";

// Long unbroken string — stress-tests break-words / overflow clipping
const unbrokenTitlePost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    title:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
});

// Natural multi-word sentence — stress-tests line-clamp wrapping behavior
const loremTitlePost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    title:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat",
  },
});

// Long unbroken creator slug — stress-tests byline truncation
const longCreatorNamePost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    creatorSlug:
      "averylongcreatornamewithnospacesatall@averylonghostname.example.com",
  },
});

// Long unbroken community slug — stress-tests byline truncation
const longCommunityNamePost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    communitySlug:
      "averylongcommunitynamewithnospacesatall@averylonghostname.example.com",
  },
});

// Many flairs — stress-tests flair row overflow across all card styles
const manyFlairs = [
  api.getFlair({ title: "Bug", backgroundColor: "#ef4444", color: "#ffffff" }),
  api.getFlair({
    title: "Feature Request",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
  }),
  api.getFlair({
    title: "Discussion",
    backgroundColor: "#8b5cf6",
    color: "#ffffff",
  }),
  api.getFlair({ title: "Help", backgroundColor: "#f59e0b", color: "#ffffff" }),
  api.getFlair({
    title: "Announcement",
    backgroundColor: "#10b981",
    color: "#ffffff",
  }),
  api.getFlair({ title: "Meta", backgroundColor: "#6b7280", color: "#ffffff" }),
  api.getFlair({ title: "Meme", backgroundColor: "#ec4899", color: "#ffffff" }),
  api.getFlair({ title: "News", backgroundColor: "#0ea5e9", color: "#ffffff" }),
];
const manyFlairsPost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    flairs: manyFlairs.map((f) => ({ id: f.id })),
  },
});

// Cross post with a very long community slug — stress-tests cross post row overflow
const longCrossPostCommunityPost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    body: "Short post body",
    crossPosts: [
      {
        apId: "https://blorpblorp.xyz/post/2001",
        communitySlug:
          "averylongcommunitynamewithnospacesatall@averylonghostname.example.com",
      },
    ],
  },
});

// 20 cross posts — stress-tests cross post row wrapping/overflow
const manyCrossPostsPost = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    body: "Short post body",
    crossPosts: Array.from({ length: 10 }, (_, i) => ({
      apId: `https://blorpblorp.xyz/post/${3000 + i}`,
      communitySlug: `community${i + 1}@example${i + 1}.com`,
    })),
  },
});

const ALL_FLAIRS = manyFlairs;

const POSTS = [
  unbrokenTitlePost,
  loremTitlePost,
  longCreatorNamePost,
  longCommunityNamePost,
  manyFlairsPost,
  longCrossPostCommunityPost,
  manyCrossPostsPost,
];

function LoadData() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheFlairs = useFlairsStore((s) => s.cacheFlairs);

  useEffect(() => {
    cacheProfiles(
      getCachePrefixer(),
      POSTS.map((p) => p.creator),
    );
    cachePosts(
      getCachePrefixer(),
      POSTS.map((p) => p.post),
    );
    cacheFlairs(getCachePrefixer(), ALL_FLAIRS);
  }, [cachePosts, cacheProfiles, getCachePrefixer, cacheFlairs]);

  return null;
}

const meta: Meta<typeof PostCard> = {
  component: PostCard,
  decorators: (Story) => (
    <>
      <LoadData />
      <div className="max-w-xs">
        <Story />
      </div>
      <div className="max-w-lg">
        <Story />
      </div>
    </>
  ),
};

export default meta;
type Story = StoryObj<typeof PostCard>;

// ─── Unbroken title ───────────────────────────────────────────────────────────

export const UnbrokenTitleLarge: Story = {
  args: {
    apId: unbrokenTitlePost.post.apId,
    featuredContext: "community",
    postCardStyle: "large",
  },
};

export const UnbrokenTitleSmall: Story = {
  args: {
    apId: unbrokenTitlePost.post.apId,
    featuredContext: "community",
    postCardStyle: "small",
  },
};

export const UnbrokenTitleExtraSmall: Story = {
  args: {
    apId: unbrokenTitlePost.post.apId,
    featuredContext: "community",
    postCardStyle: "extra-small",
  },
};

// ─── Realistic multi-word title ───────────────────────────────────────────────

export const LoremTitleLarge: Story = {
  args: {
    apId: loremTitlePost.post.apId,
    featuredContext: "community",
    postCardStyle: "large",
  },
};

export const LoremTitleSmall: Story = {
  args: {
    apId: loremTitlePost.post.apId,
    featuredContext: "community",
    postCardStyle: "small",
  },
};

export const LoremTitleExtraSmall: Story = {
  args: {
    apId: loremTitlePost.post.apId,
    featuredContext: "community",
    postCardStyle: "extra-small",
  },
};

// ─── Long creator name (featuredContext="community" → shows creator) ───────────

export const LongCreatorNameLarge: Story = {
  args: {
    apId: longCreatorNamePost.post.apId,
    featuredContext: "community",
    postCardStyle: "large",
  },
};

export const LongCreatorNameSmall: Story = {
  args: {
    apId: longCreatorNamePost.post.apId,
    featuredContext: "community",
    postCardStyle: "small",
  },
};

export const LongCreatorNameExtraSmall: Story = {
  args: {
    apId: longCreatorNamePost.post.apId,
    featuredContext: "community",
    postCardStyle: "extra-small",
  },
};

// ─── Long community name (featuredContext="user" → shows community) ────────────

export const LongCommunityNameLarge: Story = {
  args: {
    apId: longCommunityNamePost.post.apId,
    featuredContext: "user",
    postCardStyle: "large",
  },
};

export const LongCommunityNameSmall: Story = {
  args: {
    apId: longCommunityNamePost.post.apId,
    featuredContext: "user",
    postCardStyle: "small",
  },
};

export const LongCommunityNameExtraSmall: Story = {
  args: {
    apId: longCommunityNamePost.post.apId,
    featuredContext: "user",
    postCardStyle: "extra-small",
  },
};

// ─── Many flairs (all card styles) ───────────────────────────────────────────

export const ManyFlairsLarge: Story = {
  args: {
    apId: manyFlairsPost.post.apId,
    featuredContext: "community",
    postCardStyle: "large",
  },
};

export const ManyFlairsSmall: Story = {
  args: {
    apId: manyFlairsPost.post.apId,
    featuredContext: "community",
    postCardStyle: "small",
  },
};

export const ManyFlairsExtraSmall: Story = {
  args: {
    apId: manyFlairsPost.post.apId,
    featuredContext: "community",
    postCardStyle: "extra-small",
  },
};

// ─── Cross post overflow (detail view only — cross posts never show in list) ──

export const LongCrossPostCommunity: Story = {
  args: {
    apId: longCrossPostCommunityPost.post.apId,
    detailView: true,
    postCardStyle: "large",
  },
};

export const ManyCrossPosts: Story = {
  args: {
    apId: manyCrossPostsPost.post.apId,
    detailView: true,
    postCardStyle: "large",
  },
};
