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

type Data = Schemas.Feed;

type CachedFeed = {
  data: Data;
  lastUsed: number;
};

type FeedStore = {
  feeds: Record<string, CachedFeed>;
  patchFeed: (
    id: string,
    prefix: CachePrefixer,
    feed: Partial<Schemas.Feed>,
  ) => void;
  cacheFeed: (prefix: CachePrefixer, data: Data) => void;
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

export const useFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      patchFeed: (slug, prefix, patch) => {
        const feeds = get().feeds;
        const cacheKey = prefix(slug);
        const prevFeedData = feeds[cacheKey]?.data;
        if (!prevFeedData) {
          console.error(
            "attempted to patch a feed that does not exist in the cache",
          );
          return;
        }
        const updatedFeedData: Data = {
          ...prevFeedData,
          ...patch,
        };
        set({
          feeds: {
            ...feeds,
            [cacheKey]: {
              data: updatedFeedData,
              lastUsed: Date.now(),
            },
          },
        });
      },
      cacheFeed: (prefix, view) => {
        const prev = get();
        const slug = view.apId;
        if (slug) {
          const cacheKey = prefix(slug);
          const prevFeedData = prev.feeds[cacheKey]?.data;
          const updatedFeedData: Data = {
            ...prevFeedData,
            ...view,
          };
          set({
            feeds: {
              ...prev.feeds,
              [cacheKey]: {
                data: updatedFeedData,
                lastUsed: Date.now(),
              },
            },
          });
        }
      },
      cacheFeeds: (prefix, views) => {
        const prev = get().feeds;

        const newFeeds: Record<string, CachedFeed> = {};

        for (const view of views) {
          const slug = view.id;
          // TODO: use apId
          //const slug = view.apId;
          if (slug) {
            const cacheKey = prefix(slug);
            const prevFeedData = prev[cacheKey]?.data;
            const data = {
              ...prevFeedData,
              ...view,
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
      name: "feed",
      storage: createStorage<FeedStore>(),
      version: 1,
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

sync(useFeedStore);

export function useFeedFromStore(apId?: string) {
  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useFeedStore((s) =>
    apId ? s.feeds[cachePrefixer()(apId)]?.data : undefined,
  );
}

export function useFeedsFromStore(apId?: string[]) {
  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useFeedStore(
    useShallow((s) =>
      apId
        ?.map((slug) => s.feeds[cachePrefixer()(slug)]?.data)
        .filter(isNotNil),
    ),
  );
}
