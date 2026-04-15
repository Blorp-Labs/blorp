import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostByline } from "./post-byline";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { usePostsStore } from "@/src/stores/posts";
import { useProfilesStore } from "@/src/stores/profiles";
import { waitForHydration } from "@/test-utils/storybook";

const postView = api.getPost();

async function loadData() {
  await waitForHydration(useAuth, usePostsStore, useProfilesStore);
  const prefixer = useAuth.getState().getCachePrefixer();
  usePostsStore.getState().cachePosts(prefixer, [postView.post]);
  useProfilesStore.getState().cacheProfiles(prefixer, [postView.creator]);
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof PostByline> = {
  component: PostByline,
  loaders: [loadData],
};

export default meta;
type Story = StoryObj<typeof PostByline>;

export const Byline: Story = {
  args: {
    post: postView.post,
    showCommunity: true,
    showCreator: true,
  },
};
