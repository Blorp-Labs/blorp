import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import z from "zod";
import { communitySchema, Schemas } from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import { mergeCacheArray } from "./utils";

const recentCommunitySchema = communitySchema.extend({
  accountUuid: z.string().optional(),
});

export type RecentCommunity = z.infer<typeof recentCommunitySchema>;

const persistedSchema = z.object({
  recentlyVisited: z.array(recentCommunitySchema),
});

type RecentCommunityStore = z.infer<typeof persistedSchema> & {
  update: (c: Schemas.Community, accountUuid: string | undefined) => void;
  reset: () => void;
};

export const MAX_VISITED = 100;

const INIT_STATE = {
  recentlyVisited: [],
};

function pruneCommunitites(communities: RecentCommunity[]) {
  return _.slice(
    _.uniqBy(communities, (c) => c.apId),
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
    recentlyVisited: z.array(recentCommunitySchema.passthrough()),
  });
  return lenientSchema.parse({ ...state, recentlyVisited });
}

export const useRecentCommunitiesStore = create<RecentCommunityStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      update: (community, accountUuid) => {
        const prev = get().recentlyVisited;
        set({
          recentlyVisited: pruneCommunitites([
            { ...community, accountUuid },
            ...prev,
          ]),
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
      version: 1,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (p: any, current) => {
        const migrated = migrateRecentCommunities(p ?? {});
        return {
          ...current,
          recentlyVisited: pruneCommunitites(
            mergeCacheArray(
              current.recentlyVisited,
              migrated.recentlyVisited as unknown[] | undefined,
              recentCommunitySchema,
            ),
          ),
        } satisfies RecentCommunityStore;
      },
    },
  ),
);

sync(useRecentCommunitiesStore);
