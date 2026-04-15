import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityBanner } from "./community-banner";
import { useCommunitiesStore } from "@/src/stores/communities";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";

const COMMUNITY = api.getCommunity();

function loadData() {
  const prefixer = useAuth.getState().getCachePrefixer();
  useCommunitiesStore.getState().cacheCommunity(prefixer, {
    communityView: COMMUNITY,
  });
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof CommunityBanner> = {
  component: CommunityBanner,
  loaders: [loadData],
};

export default meta;
type Story = StoryObj<typeof CommunityBanner>;

export const Banner: Story = {
  args: {
    communityName: COMMUNITY.slug,
  },
};
