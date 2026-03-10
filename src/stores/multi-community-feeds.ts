import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { CachePrefixer, useAuth } from "./auth";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import { isTest } from "../lib/device";
import { useShallow } from "zustand/shallow";
import { isNotNil } from "../lib/utils";

type Data = {
  feedView: Schemas.MultiCommunityFeed;
};

type CachedFeed = {
  data: Data;
  lastUsed: number;
};

type FeedStore = {
  feeds: Record<string, CachedFeed>;
  patchFeed: (
    id: string,
    prefix: CachePrefixer,
    patch: Partial<Schemas.MultiCommunityFeed>,
  ) => void;
  cacheFeeds: (
    prefix: CachePrefixer,
    data: Data[],
  ) => Record<string, CachedFeed>;
  cleanup: () => void;
  reset: () => any;
};

const INIT_STATE = {
  feeds: {},
};

export const useMultiCommunityFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      patchFeed: (slug, prefix, patch) => {
        const feeds = get().feeds;
        const cacheKey = prefix(slug);
        const prevData = feeds[cacheKey]?.data;
        if (!prevData) {
          console.error(
            "attempted to patch a feed that does not exist in the cache",
          );
          return;
        }
        const updatedData: Data = {
          ...prevData,
          feedView: {
            ...prevData.feedView,
            ...patch,
          },
        };
        set({
          feeds: {
            ...feeds,
            [cacheKey]: {
              data: updatedData,
              lastUsed: Date.now(),
            },
          },
        });
      },
      cacheFeeds: (prefix, views) => {
        const prev = get().feeds;

        const newFeeds: Record<string, CachedFeed> = {};

        for (const view of views) {
          const slug = view.feedView.apId;
          if (slug) {
            const cacheKey = prefix(slug);
            const prevData = prev[cacheKey]?.data;
            const data: Data = {
              ...prevData,
              ...view,
              feedView: {
                ...prevData?.feedView,
                ...view.feedView,
                // Clear any stuck optimistic state when fresh server data arrives
                optimisticSubscribed: undefined,
                // Preserve previously cached community slugs if new data has none
                // (e.g. list endpoint fetches feeds without communities)
                communitySlugs:
                  view.feedView.communitySlugs.length > 0
                    ? view.feedView.communitySlugs
                    : (prevData?.feedView.communitySlugs ?? []),
              },
            };
            newFeeds[cacheKey] = {
              data,
              lastUsed: Date.now(),
            };
          }
        }

        const updatedFeeds = {
          ...prev,
          ...newFeeds,
        };

        set({
          feeds: updatedFeeds,
        });

        return updatedFeeds;
      },
      cleanup: () => {
        const now = Date.now();

        const feeds = _.clone(get().feeds);

        for (const key in feeds) {
          const feed = feeds[key];
          if (feed) {
            const shouldEvict = now - feed.lastUsed > MAX_CACHE_MS;
            if (shouldEvict) {
              delete feeds[key];
            }
          }
        }

        set({ feeds });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "multi-community-feeds",
      storage: createStorage<FeedStore>(),
      version: 2,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<FeedStore>;
        return {
          ...current,
          ...persisted,
          feeds: {
            ...current.feeds,
            ...persisted.feeds,
          },
        } satisfies FeedStore;
      },
    },
  ),
);

sync(useMultiCommunityFeedStore);

export function useMultiCommunityFeedFromStore(apId?: string) {
  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useMultiCommunityFeedStore((s) =>
    apId ? s.feeds[cachePrefixer()(apId)]?.data : undefined,
  );
}

export function useMultiCommunityFeedsFromStore(apId?: string[]) {
  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useMultiCommunityFeedStore(
    useShallow((s) =>
      apId
        ?.map((slug) => s.feeds[cachePrefixer()(slug)]?.data)
        .filter(isNotNil),
    ),
  );
}
