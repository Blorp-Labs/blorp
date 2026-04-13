import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { isTest } from "../lib/device";
import z from "zod";

type RecentCommunityStore = {
  searchHistory: string[];
  saveSearch: (search: string) => void;
  removeSearch: (search: string) => void;
  reset: () => void;
};

const persistedSchema = z.object({
  searchHistory: z.array(z.string()),
});

export const MAX_SAVED = 100;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  searchHistory: [],
};

function pruneSearches(existingSearches: string[], newSearches: string[]) {
  return _.slice(_.uniq([...newSearches, ...existingSearches]), 0, MAX_SAVED);
}

export const useSearchStore = create<RecentCommunityStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      saveSearch: (search) => {
        const prev = get().searchHistory;
        set({
          searchHistory: pruneSearches(prev, [search]),
        });
      },
      removeSearch: (search) => {
        const prev = get().searchHistory;
        set({
          searchHistory: prev.filter((s) => s !== search),
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
        const persisted = p as Partial<RecentCommunityStore>;
        return {
          ...current,
          ...persisted,
          searchHistory: pruneSearches(
            persisted.searchHistory ?? [],
            current.searchHistory,
          ),
        } satisfies RecentCommunityStore;
      },
    },
  ),
);

sync(useSearchStore);
