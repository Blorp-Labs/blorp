import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { CachePrefixer } from "./auth";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import { isTest } from "../lib/device";

type Data = {
  communityView: Schemas.Community;
  mods?: Schemas.Person[];
  flairs?: { id: number };
};

type CachedCommunity = {
  data: Data;
  lastUsed: number;
};

type CommunityStore = {
  communities: Record<string, CachedCommunity>;
  patchCommunity: (
    id: string,
    prefix: CachePrefixer,
    post: {
      communityView?: Partial<Schemas.Community>;
      mods?: Schemas.Person[];
    },
  ) => void;
  cacheCommunity: (prefix: CachePrefixer, data: Data) => void;
  cacheCommunities: (
    prefix: CachePrefixer,
    data: Data[],
  ) => Record<string, CachedCommunity>;
  cleanup: () => any;
  reset: () => any;
};

const INIT_STATE = {
  communities: {},
};

export const useCommunitiesStore = create<CommunityStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      patchCommunity: (slug, prefix, patch) => {
        const communities = get().communities;
        const cacheKey = prefix(slug);
        const prevCommunityData = communities[cacheKey]?.data;
        if (!prevCommunityData) {
          console.error(
            "attempted to patch a community that does not exist in the cache",
          );
          return;
        }
        const updatedCommunityData: Data = {
          ...prevCommunityData,
          ...patch,
          communityView: {
            ...prevCommunityData.communityView,
            ...patch.communityView,
          },
        };
        set({
          communities: {
            ...communities,
            [cacheKey]: {
              data: updatedCommunityData,
              lastUsed: Date.now(),
            },
          },
        });
      },
      cacheCommunity: (prefix, view) => {
        const prev = get();
        const slug = view.communityView.slug;
        if (slug) {
          const cacheKey = prefix(slug);
          const prevCommunityData = prev.communities[cacheKey]?.data;
          const updatedCommunityData: Data = {
            ...prevCommunityData,
            ...view,
            communityView: {
              ...prevCommunityData?.communityView,
              ...view.communityView,
            },
          };
          set({
            communities: {
              ...prev.communities,
              [cacheKey]: {
                data: updatedCommunityData,
                lastUsed: Date.now(),
              },
            },
          });
        }
      },
      cacheCommunities: (prefix, views) => {
        const prev = get().communities;

        const newCommunities: Record<string, CachedCommunity> = {};

        for (const view of views) {
          const slug = view.communityView.slug;
          if (slug) {
            const cacheKey = prefix(slug);
            const prevCommunityData = prev[cacheKey]?.data;
            newCommunities[cacheKey] = {
              data: {
                ...prevCommunityData,
                ...view,
                communityView: {
                  ...prevCommunityData?.communityView,
                  ...view.communityView,
                },
              },
              lastUsed: Date.now(),
            };
          }
        }

        const updatedCommunities = {
          ...prev,
          ...newCommunities,
        };

        set({
          communities: updatedCommunities,
        });

        return updatedCommunities;
      },
      cleanup: () => {
        const now = Date.now();

        const communities = _.clone(get().communities);

        for (const key in communities) {
          const community = communities[key];
          if (community) {
            const shouldEvict = now - community.lastUsed > MAX_CACHE_MS;
            if (shouldEvict) {
              delete communities[key];
            }
          }
        }

        return communities;
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "communities",
      storage: createStorage<CommunityStore>(),
      version: 2,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<CommunityStore>;
        return {
          ...current,
          ...persisted,
          communities: {
            ...current.communities,
            ...persisted.communities,
          },
        } satisfies CommunityStore;
      },
    },
  ),
);

sync(useCommunitiesStore);
