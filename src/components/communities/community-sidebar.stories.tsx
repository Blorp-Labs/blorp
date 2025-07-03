import type { Meta, StoryObj } from "@storybook/react";

import { CommunitySidebar } from "./community-sidebar";

import { useCommunitiesStore } from "@/src/stores/communities";
import { useEffect } from "react";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";

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
const meta: Meta<typeof CommunitySidebar> = {
  component: CommunitySidebar,
  decorators: (Story) => (
    <>
      <LoadCommunity />
      <Story />
    </>
  ),
};

export default meta;
type Story = StoryObj<typeof CommunitySidebar>;

export const Sidebar: Story = {
  args: {
    communityName: COMMUNITY.slug,
    asPage: true,
  },
};
