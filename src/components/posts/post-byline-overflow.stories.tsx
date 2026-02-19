import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostByline } from "./post-byline";
import * as api from "@/test-utils/api";

// Long unbroken creator slug — stress-tests creator name truncation
const longCreatorNamePost = api.getPost({
  post: {
    id: api.randomDbId(),
    creatorSlug:
      "averylongcreatornamewithnospacesatall@averylonghostname.example.com",
  },
});

// Long unbroken community slug — stress-tests community name truncation
const longCommunityNamePost = api.getPost({
  post: {
    id: api.randomDbId(),
    communitySlug:
      "averylongcommunitynamewithnospacesatall@averylonghostname.example.com",
  },
});

const meta: Meta<typeof PostByline> = {
  component: PostByline,
  decorators: (Story) => (
    <div className="max-w-[300px]">
      <Story />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof PostByline>;

export const LongCreatorName: Story = {
  args: {
    post: longCreatorNamePost.post,
    showCreator: true,
    showCommunity: false,
    pinned: false,
  },
};

export const LongCommunityName: Story = {
  args: {
    post: longCommunityNamePost.post,
    showCreator: false,
    showCommunity: true,
    pinned: false,
  },
};
