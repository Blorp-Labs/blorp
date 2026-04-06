import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { Account, CacheKey, CachePrefixer, useAuth } from "./auth";
import { Schemas, personSchema } from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import z from "zod";
import { mergeCacheObject } from "./utils";

const cachedProfileSchema = z.object({
  data: personSchema,
  lastUsed: z.number(),
});

type CachedProfile = z.infer<typeof cachedProfileSchema>;

type ProfilesStore = {
  profiles: Record<CacheKey, CachedProfile>;
  patchProfile: (
    id: string,
    prefixer: CachePrefixer,
    post: Partial<Schemas.Person>,
  ) => void;
  cacheProfiles: (
    prefixer: CachePrefixer,
    data: Schemas.Person[],
  ) => Record<string, CachedProfile>;
  cleanup: () => void;
  reset: () => void;
};

const INIT_STATE = {
  profiles: {} satisfies Record<CacheKey, CachedProfile>,
};

export const useProfilesStore = create<ProfilesStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      patchProfile: (apId, prefix, patch) => {
        const profiles = get().profiles;
        const cacheKey = prefix(apId);
        const prevProfileData = profiles[cacheKey]?.data;
        // TODO: techincailly we could allow this
        // so long as patch contains person
        if (!prevProfileData) {
          console.error("failed to patch person that is not in cache");
          return;
        }
        const updatedProfileData: Schemas.Person = {
          ...prevProfileData,
          ...patch,
        };
        set({
          profiles: {
            ...profiles,
            [cacheKey]: {
              data: updatedProfileData,
              lastUsed: Date.now(),
            },
          },
        });
        return updatedProfileData;
      },
      cacheProfiles: (prefix, views) => {
        const prev = get().profiles;

        const newProfiles: Record<string, CachedProfile> = {};

        for (const view of views) {
          const cacheKey = prefix(view.apId);
          const prevProfileData = prev[cacheKey]?.data ?? {};
          newProfiles[cacheKey] = {
            data: {
              ...prevProfileData,
              ...view,
            },
            lastUsed: Date.now(),
          };
        }

        const updatedProfiles = {
          ...prev,
          ...newProfiles,
        };

        set({
          profiles: updatedProfiles,
        });

        return updatedProfiles;
      },
      cleanup: () => {
        const now = Date.now();

        const profiles = _.clone(get().profiles);

        for (const k in profiles) {
          const key = k as keyof typeof profiles;
          const community = profiles[key];
          if (community) {
            const shouldEvict = now - community.lastUsed > MAX_CACHE_MS;
            if (shouldEvict) {
              delete profiles[key];
            }
          }
        }

        set({ profiles });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "profiles",
      storage: createStorage<ProfilesStore>(),
      version: 2,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<ProfilesStore>;
        return {
          ...current,
          ...persisted,
          profiles: mergeCacheObject(
            current.profiles,
            persisted.profiles,
            cachedProfileSchema,
          ),
        } satisfies ProfilesStore;
      },
    },
  ),
);

sync(useProfilesStore);

export function useProfileFromStore(apId?: string, account?: Account) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useProfilesStore((s) =>
    apId ? s.profiles[getCachePrefixer(account)(apId)]?.data : undefined,
  );
}
