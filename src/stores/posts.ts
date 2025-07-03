import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { CacheKey, CachePrefixer } from "./auth";
import { Schemas } from "../lib/lemmy/adapters/adapter";

type CachedPost = {
  data: Schemas.Post;
  lastUsed: number;
};

type SortsStore = {
  posts: Record<CacheKey, CachedPost>;
  patchPost: (
    id: Schemas.Post["apId"],
    prefix: CachePrefixer,
    post: Partial<Schemas.Post>,
  ) => void;
  cachePosts: (
    prefix: CachePrefixer,
    post: Schemas.Post[],
  ) => Record<string, CachedPost>;
  cleanup: () => any;
};

export const usePostsStore = create<SortsStore>()(
  persist(
    (set, get) => ({
      posts: {},
      patchPost: (apId, prefix, patch) => {
        const prev = get().posts;
        const cacheKey = prefix(apId);
        const prevPostData = prev[cacheKey]?.data;
        if (!prevPostData) {
          console.error("failed to patch post that isn't in cache");
          return;
        }
        const updatedPostData: Schemas.Post = {
          ...prevPostData,
          ...patch,
          thumbnailAspectRatio:
            patch.thumbnailAspectRatio ?? prevPostData?.thumbnailAspectRatio,
          crossPosts: patch.crossPosts ?? prevPostData?.crossPosts ?? null,
        };
        set({
          posts: {
            ...prev,
            [cacheKey]: {
              data: updatedPostData,
              lastUsed: Date.now(),
            },
          },
        });
        return updatedPostData;
      },
      cachePosts: (prefix, views) => {
        const prev = get().posts;

        const newPosts: Record<string, CachedPost> = {};

        for (const view of views) {
          const cacheKey = prefix(view.apId);
          const prevPostData = prev[cacheKey]?.data;
          newPosts[cacheKey] = {
            data: {
              ...prevPostData,
              ...view,
              thumbnailAspectRatio:
                view.thumbnailAspectRatio ??
                prevPostData?.thumbnailAspectRatio ??
                null,
              crossPosts: view.crossPosts ?? prevPostData?.crossPosts ?? null,
            },
            lastUsed: Date.now(),
          };
        }

        const updatedPosts = {
          ...prev,
          ...newPosts,
        };

        set({
          posts: updatedPosts,
        });

        return updatedPosts;
      },
      cleanup: () => {
        const now = Date.now();

        const posts = _.clone(get().posts);

        for (const k in posts) {
          const key = k as keyof typeof posts;
          const post = posts[key];
          if (post) {
            const shouldEvict = now - post.lastUsed > MAX_CACHE_MS;
            if (shouldEvict) {
              delete posts[key];
            }
          }
        }

        return posts;
      },
    }),
    {
      name: "posts",
      storage: createStorage<SortsStore>(),
      version: 4.03,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
    },
  ),
);

sync(usePostsStore);
