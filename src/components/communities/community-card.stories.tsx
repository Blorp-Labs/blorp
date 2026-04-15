import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityCard } from "./community-card";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useCommunitiesStore } from "@/src/stores/communities";

const COMMUNITY = api.getCommunity();

function loadData() {
  const prefixer = useAuth.getState().getCachePrefixer();
  useCommunitiesStore.getState().cacheCommunity(prefixer, {
    communityView: COMMUNITY,
  });
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof CommunityCard> = {
  component: CommunityCard,
  loaders: [loadData],
};

export default meta;
type Story = StoryObj<typeof CommunityCard>;

export const Card: Story = {
  args: {
    communitySlug: COMMUNITY.slug,
    size: "md",
  },
};
