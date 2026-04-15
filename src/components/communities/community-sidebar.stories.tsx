import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunitySidebar } from "./community-sidebar";

import { useCommunitiesStore } from "@/src/stores/communities";
import * as api from "@/test-utils/api";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";

const COMMUNITY = api.getCommunity();
const MODS = Array.from({ length: 5 })
  .fill(0)
  .map((_, id) => api.getPerson({ id }));

function loadData() {
  const prefixer = useAuth.getState().getCachePrefixer();
  useCommunitiesStore.getState().cacheCommunity(prefixer, {
    communityView: COMMUNITY,
    mods: MODS,
  });
  useProfilesStore.getState().cacheProfiles(prefixer, MODS);
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof CommunitySidebar> = {
  component: CommunitySidebar,
  loaders: [loadData],
};

export default meta;
type Story = StoryObj<typeof CommunitySidebar>;

export const Sidebar: Story = {
  args: {
    communityName: COMMUNITY.slug,
    asPage: true,
  },
};
