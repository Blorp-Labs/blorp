import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostByline } from "./post-byline";
import * as api from "@/test-utils/api";

const postView = api.getPost();

const meta: Meta<typeof PostByline> = {
  component: PostByline,
};

export default meta;
type Story = StoryObj<typeof PostByline>;

export const Byline: Story = {
  args: {
    post: postView.post,
    creator: postView.creator,
    community: postView.community,
    showCommunity: true,
    showCreator: true,
  },
};
