import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { Account, CachePrefixer, useAuth } from "./auth";
import { Schemas, communitySchema, personSchema } from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import { useShallow } from "zustand/shallow";
import { isNotNil } from "../lib/utils";
import z from "zod";
import { mergeCacheObject } from "./utils";

const cachedCommunitySchema = z.object({
  data: z.object({
    communityView: communitySchema,
    mods: z.array(personSchema).optional(),
    flairs: z.array(z.object({ id: z.number() })).optional(),
  }),
  lastUsed: z.number(),
});

const persistedSchema = z.object({
  communities: z.record(z.string(), cachedCommunitySchema),
});

type Data = z.infer<typeof cachedCommunitySchema>["data"];
type CachedCommunity = z.infer<typeof cachedCommunitySchema>;

type CommunityStore = {
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
  cleanup: () => void;
  reset: () => any;
} & z.infer<typeof persistedSchema>;

const INIT_STATE: z.infer<typeof persistedSchema> = {
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
        updatedCommunityData.flairs = updatedCommunityData.flairs?.map((f) =>
          _.pick(f, ["id"]),
        );
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
        const slug = view.communityView.handle;
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
          updatedCommunityData.flairs = updatedCommunityData.flairs?.map((f) =>
            _.pick(f, ["id"]),
          );
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
          const slug = view.communityView.handle;
          if (slug) {
            const cacheKey = prefix(slug);
            const prevCommunityData = prev[cacheKey]?.data;
            const data = {
              ...prevCommunityData,
              ...view,
              communityView: {
                ...prevCommunityData?.communityView,
                ...view.communityView,
              },
            };
            data.flairs = data.flairs?.map((f) => _.pick(f, ["id"]));
            newCommunities[cacheKey] = {
              data,
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

        set({ communities });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "communities",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 2,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<CommunityStore>;
        return {
          ...current,
          ...persisted,
          communities: mergeCacheObject(
            current.communities,
            persisted.communities,
            cachedCommunitySchema,
          ),
        } satisfies CommunityStore;
      },
    },
  ),
);

sync(useCommunitiesStore);

export function useCommunityFromStore(
  communityHandle?: string,
  account?: Account,
) {
  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useCommunitiesStore((s) =>
    communityHandle
      ? s.communities[cachePrefixer(account)(communityHandle)]?.data
      : undefined,
  );
}

export function useCommunitiesFromStore(communityHandle?: string[]) {
  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useCommunitiesStore(
    useShallow((s) =>
      communityHandle
        ?.map((slug) => s.communities[cachePrefixer()(slug)]?.data)
        .filter(isNotNil),
    ),
  );
}
