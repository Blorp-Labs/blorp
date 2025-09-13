import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostCard } from "./post";
import _ from "lodash";
import * as api from "@/test-utils/api";
import { usePostsStore } from "@/src/stores/posts";
import { useEffect } from "react";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";

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

const POSTS = [
  textPost,
  imgPost,
  articlePost,
  youtubePost,
  soundcloudPost,
  videoPost,
  loopsPost,
  vimeoPost,
];

function LoadData() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);

  useEffect(() => {
    cacheProfiles(
      getCachePrefixer(),
      POSTS.map((p) => p.creator),
    );
    cachePosts(
      getCachePrefixer(),
      POSTS.map((p) => p.post),
    );
  }, [cachePosts, cacheProfiles, getCachePrefixer]);

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
