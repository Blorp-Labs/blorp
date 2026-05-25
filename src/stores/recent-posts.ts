import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import z from "zod";
import {
  communitySchema,
  personSchema,
  postSchema,
} from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import { mergeCacheArray } from "./utils";

const recentPostSchema = z.object({
  apId: z.string(),
  accountUuid: z.string().optional(),
  post: postSchema,
  community: communitySchema,
  creator: personSchema,
});

export type RecentPost = z.infer<typeof recentPostSchema>;

const persistedSchema = z.object({
  recentlyVisited: z.array(recentPostSchema),
});

type RecentPostStore = z.infer<typeof persistedSchema> & {
  update: (entry: RecentPost) => void;
  reset: () => void;
};

export const MAX_VISITED = 100;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  recentlyVisited: [],
};

function prunePosts(posts: RecentPost[]) {
  return _.slice(
    _.uniqBy(posts, (p) => p.apId),
    0,
    MAX_VISITED,
  );
}

export const useRecentPostsStore = create<RecentPostStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      update: (entry) => {
        const prev = get().recentlyVisited;
        set({
          recentlyVisited: prunePosts([entry, ...prev]),
        });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "recent-posts",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 1,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<z.infer<typeof persistedSchema>>;
        return {
          ...current,
          recentlyVisited: prunePosts(
            mergeCacheArray(
              current.recentlyVisited,
              persisted.recentlyVisited as unknown[] | undefined,
              recentPostSchema,
            ),
          ),
        } satisfies RecentPostStore;
      },
    },
  ),
);

sync(useRecentPostsStore);
