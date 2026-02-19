import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostCard } from "./post";
import _ from "lodash";
import * as api from "@/test-utils/api";
import { usePostsStore } from "@/src/stores/posts";
import { useEffect } from "react";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { useFlairsStore } from "@/src/stores/flairs";

const textPost = api.getPost({
  variant: "text",
  post: { id: api.randomDbId() },
});
const imgPost = api.getPost({
  variant: "image",
  post: { id: api.randomDbId() },
});
const articlePost = api.getPost({
  variant: "article",
  post: { id: api.randomDbId() },
});
const youtubePost = api.getPost({
  variant: "youtube",
  post: { id: api.randomDbId() },
});
const soundcloudPost = api.getPost({
  variant: "soundcloud",
  post: { id: api.randomDbId() },
});
const videoPost = api.getPost({
  variant: "video",
  post: { id: api.randomDbId() },
});
const loopsPost = api.getPost({
  variant: "loops",
  post: { id: api.randomDbId() },
});
const vimeoPost = api.getPost({
  variant: "vimeo",
  post: { id: api.randomDbId() },
});

const postFlairs = [
  api.getFlair({ title: "Bug", backgroundColor: "#ef4444", color: "#ffffff" }),
  api.getFlair({
    title: "Feature Request",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
  }),
];
const postWithFlairs = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    flairs: postFlairs.map((f) => ({ id: f.id })),
  },
});

const postWithCrossPosts = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    crossPosts: [
      {
        apId: "https://blorpblorp.xyz/post/1001",
        communitySlug: "news@lemmy.world",
      },
      {
        apId: "https://blorpblorp.xyz/post/1002",
        communitySlug: "technology@beehaw.org",
      },
      {
        apId: "https://blorpblorp.xyz/post/1003",
        communitySlug: "worldnews@feddit.de",
      },
    ],
  },
});

const POSTS = [
  textPost,
  imgPost,
  articlePost,
  youtubePost,
  soundcloudPost,
  videoPost,
  loopsPost,
  vimeoPost,
  postWithFlairs,
  postWithCrossPosts,
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
    cacheFlairs(getCachePrefixer(), postFlairs);
  }, [cachePosts, cacheProfiles, getCachePrefixer, cacheFlairs]);

  return null;
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof PostCard> = {
  component: PostCard,
  decorators: (Story) => {
    return (
      <>
        <LoadData />
        <Story />
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof PostCard>;

export const Text: Story = {
  args: {
    apId: textPost.post.apId,
  },
};

export const Image: Story = {
  args: {
    apId: imgPost.post.apId,
  },
};

export const Article: Story = {
  args: {
    apId: articlePost.post.apId,
  },
};

export const YouTube: Story = {
  args: {
    apId: youtubePost.post.apId,
  },
};

export const SoundCloud: Story = {
  args: {
    apId: soundcloudPost.post.apId,
  },
};

export const VideoPost: Story = {
  args: {
    apId: videoPost.post.apId,
  },
};

export const LoopsPost: Story = {
  args: {
    apId: loopsPost.post.apId,
  },
};

export const VimeoPost: Story = {
  args: {
    apId: vimeoPost.post.apId,
  },
};

export const WithFlairs: Story = {
  args: {
    apId: postWithFlairs.post.apId,
  },
};

export const WithCrossPosts: Story = {
  args: {
    apId: postWithCrossPosts.post.apId,
    detailView: true,
  },
};
