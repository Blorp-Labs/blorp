import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { communitySchema, Schemas } from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import { mergeCacheArray } from "./utils";

type RecentCommunityStore = {
  recentlyVisited: Schemas.Community[];
  update: (c: Schemas.Community) => void;
  reset: () => void;
};

export const MAX_VISITED = 100;

const INIT_STATE = {
  recentlyVisited: [],
};

function mergeCommunities(
  existingCommunities: Schemas.Community[],
  newCommunities: Schemas.Community[],
) {
  return _.slice(
    _.uniqBy([...newCommunities, ...existingCommunities], (c) => c.apId),
    0,
    MAX_VISITED,
  );
}

export const useRecentCommunitiesStore = create<RecentCommunityStore>()(
  // eslint-disable-next-line local/zustand-persist-migrate -- todo
  persist(
    (set, get) => ({
      ...INIT_STATE,
      update: (comunity) => {
        const prev = get().recentlyVisited;
        set({
          recentlyVisited: mergeCommunities(prev, [comunity]),
        });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "recent-communities",
      storage: createStorage<RecentCommunityStore>(),
      version: 1,
      merge: (p: any, current) => {
        const persisted = p as Partial<RecentCommunityStore>;

        return {
          ...current,
          ...persisted,
          recentlyVisited: mergeCacheArray(
            persisted.recentlyVisited,
            current.recentlyVisited,
            communitySchema,
          ),
        } satisfies RecentCommunityStore;
      },
    },
  ),
);

sync(useRecentCommunitiesStore);
