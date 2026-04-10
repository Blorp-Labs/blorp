import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityCard } from "./community-card";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useCommunitiesStore } from "@/src/stores/communities";
import { useEffect } from "react";

const COMMUNITY = api.getCommunity();

function LoadCommunity() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheCommunity = useCommunitiesStore((s) => s.cacheCommunity);

  useEffect(() => {
    cacheCommunity(getCachePrefixer(), {
      communityView: COMMUNITY,
    });
  }, []);

  return null;
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof CommunityCard> = {
  component: CommunityCard,
  decorators: (Story) => (
    <>
      <LoadCommunity />
      <Story />
    </>
  ),
};

export default meta;
type Story = StoryObj<typeof CommunityCard>;

export const Card: Story = {
  args: {
    communityHandle: COMMUNITY.handle,
    size: "md",
  },
};
