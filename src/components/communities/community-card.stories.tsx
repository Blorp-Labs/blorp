import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityCardView } from "./community-card";
import * as api from "@/test-utils/api";

const COMMUNITY = api.getCommunity();

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof CommunityCardView> = {
  component: CommunityCardView,
};

export default meta;
type Story = StoryObj<typeof CommunityCardView>;

export const Card: Story = {
  args: {
    community: COMMUNITY,
    size: "md",
  },
};
