import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { CacheKey, CachePrefixer } from "./auth";
import { Schemas } from "../lib/api/adapters/api-blueprint";

type CachedProfile = {
  data: Schemas.Person;
  lastUsed: number;
};

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
};

export const useProfilesStore = create<ProfilesStore>()(
  persist(
    (set, get) => ({
      profiles: {},
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
    }),
    {
      name: "profiles",
      storage: createStorage<ProfilesStore>(),
      version: 2,
      merge: (p: any, current) => {
        const persisted = p as Partial<ProfilesStore>;
        return {
          ...current,
          ...persisted,
          profiles: {
            ...current.profiles,
            ...persisted.profiles,
          },
        } satisfies ProfilesStore;
      },
    },
  ),
);

sync(useProfilesStore);
