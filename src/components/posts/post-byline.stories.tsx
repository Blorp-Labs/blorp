import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostByline } from "./post-byline";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { usePostsStore } from "@/src/stores/posts";
import { useEffect } from "react";
import { useProfilesStore } from "@/src/stores/profiles";

const postView = api.getPost();

function LoadData() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);

  useEffect(() => {
    cachePosts(getCachePrefixer(), [postView.post]);
    cacheProfiles(getCachePrefixer(), [postView.creator]);
  }, [cacheProfiles, cachePosts, getCachePrefixer]);

  return null;
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof PostByline> = {
  component: PostByline,
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
type Story = StoryObj<typeof PostByline>;

export const Byline: Story = {
  args: {
    post: postView.post,
    showCommunity: true,
    showCreator: true,
  },
};
