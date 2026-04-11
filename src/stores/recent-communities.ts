import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import z from "zod";
import { communitySchema, Schemas } from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import { mergeCacheArray } from "./utils";

const persistedSchema = z.object({
  recentlyVisited: z.array(communitySchema),
});

type RecentCommunityStore = z.infer<typeof persistedSchema> & {
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

export function migrateRecentCommunities(
  state: Record<string, unknown>,
): z.infer<typeof persistedSchema> {
  const communities = (state["recentlyVisited"] ?? []) as unknown[];
  const recentlyVisited = communities.map((c) => {
    if (c && typeof c === "object") {
      const community = c as Record<string, unknown>;
      const handle = community["handle"] ?? community["slug"];
      return {
        ...community,
        // Write both so an old tab (v1) still sees slug.
        // TODO: remove slug once no old tabs are expected.
        ...(handle ? { handle, slug: handle } : {}),
      };
    }
    return c;
  });
  // Use passthrough so deprecated fields (e.g. slug) survive validation
  const lenientSchema = z.object({
    recentlyVisited: z.array(communitySchema.passthrough()),
  });
  return lenientSchema.parse({ ...state, recentlyVisited });
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
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 2,
      migrate: (state, version) => {
        if (version < 2) {
          return migrateRecentCommunities(state as Record<string, unknown>);
        }
        return state as z.infer<typeof persistedSchema>;
      },
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
