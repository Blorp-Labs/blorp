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

type Data = Schemas.Flair;

type CachedFlair = {
  data: Data;
  lastUsed: number;
};

type FlairStore = {
  flairs: Record<string, CachedFlair>;
  cacheFlairs: (
    prefix: CachePrefixer,
    data: Data[],
  ) => Record<string, CachedFlair>;
  cleanup: () => any;
  reset: () => any;
};

const INIT_STATE = {
  flairs: {},
};

export const useFlairsStore = create<FlairStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      cacheFlairs: (prefix, views) => {
        const prev = get().flairs;

        const newFlairs: Record<string, CachedFlair> = {};

        for (const view of views) {
          const cacheKey = prefix(view.id);
          const prevFlairData = prev[cacheKey]?.data;
          newFlairs[cacheKey] = {
            data: {
              ...prevFlairData,
              ...view,
            },
            lastUsed: Date.now(),
          };
        }

        const updatedFlairs = {
          ...prev,
          ...newFlairs,
        };

        set({
          flairs: updatedFlairs,
        });

        return updatedFlairs;
      },
      cleanup: () => {
        const now = Date.now();

        const flairs = _.clone(get().flairs);

        for (const key in flairs) {
          const flair = flairs[key];
          if (flair) {
            const shouldEvict = now - flair.lastUsed > MAX_CACHE_MS;
            if (shouldEvict) {
              delete flairs[key];
            }
          }
        }

        return flairs;
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "flairs",
      storage: createStorage<FlairStore>(),
      version: 2,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<FlairStore>;
        return {
          ...current,
          ...persisted,
          flairs: {
            ...current.flairs,
            ...persisted.flairs,
          },
        } satisfies FlairStore;
      },
    },
  ),
);

sync(useFlairsStore);

export function useFlairs(flairIds?: number[]) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useFlairsStore(
    useShallow((s) =>
      flairIds
        ? flairIds
            .map((id) => s.flairs[getCachePrefixer()(id)])
            .filter(isNotNil)
        : null,
    ),
  );
}
