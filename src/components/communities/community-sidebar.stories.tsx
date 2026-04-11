import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunitySidebar } from "./community-sidebar";

import { useCommunitiesStore } from "@/src/stores/communities";
import { useEffect } from "react";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";

const COMMUNITY = api.getCommunity();
const MODS = Array.from({ length: 5 })
  .fill(0)
  .map((_, id) => api.getPerson({ id }));

function LoadCommunity() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheCommunity = useCommunitiesStore((s) => s.cacheCommunity);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);

  useEffect(() => {
    cacheCommunity(getCachePrefixer(), {
      communityView: COMMUNITY,
      mods: MODS,
    });
    cacheProfiles(getCachePrefixer(), MODS);
  }, [cacheProfiles, getCachePrefixer, cacheCommunity]);

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
    communityHandle: COMMUNITY.handle,
    asPage: true,
  },
};
