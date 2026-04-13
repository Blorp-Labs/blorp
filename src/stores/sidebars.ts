import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage } from "./storage";
import { isTest } from "../lib/device";
import z from "zod";

const persistedSchema = z.object({
  mainSidebarCollapsed: z.boolean(),
  mainSidebarRecent: z.boolean(),
  mainSidebarSubscribed: z.boolean(),
  mainSidebarModerating: z.boolean(),
  siteAboutExpanded: z.boolean(),
  siteAdminsExpanded: z.boolean(),
  communityAboutExpanded: z.boolean(),
  communityFlairsExpanded: z.boolean(),
  communityModsExpanded: z.boolean(),
  personBioExpanded: z.boolean(),
  recentSearchesExpanded: z.boolean(),
});

type SidebarStore = {
  // Main (left) sidebar
  setMainSidebarCollapsed: (val: boolean) => void;

  setMainSidebarRecent: (val: boolean) => void;
  setMainSidebarSubscribed: (val: boolean) => void;
  setMainSidebarModerating: (val: boolean) => void;

  // Site sidebar
  setSiteAboutExpanded: (val: boolean) => void;
  setSiteAdminsExpanded: (val: boolean) => void;

  // Community sidebar
  setCommunityAboutExpanded: (val: boolean) => void;
  setCommunityFlairsExpanded: (val: boolean) => void;
  setCommunityModsExpanded: (val: boolean) => void;

  // User sidebar
  setPersonBioExpanded: (val: boolean) => void;

  // Search
  setRecentSearchesExpanded: (val: boolean) => void;

  reset: () => void;
} & z.infer<typeof persistedSchema>;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  mainSidebarCollapsed: false,
  mainSidebarRecent: true,
  mainSidebarSubscribed: true,
  mainSidebarModerating: true,
  siteAboutExpanded: true,
  siteAdminsExpanded: true,
  communityAboutExpanded: true,
  communityFlairsExpanded: true,
  communityModsExpanded: true,
  personBioExpanded: true,
  recentSearchesExpanded: true,
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      ...INIT_STATE,
      // Main sidebar
      setMainSidebarCollapsed: (mainSidebarCollapsed) =>
        set({ mainSidebarCollapsed }),
      setMainSidebarRecent: (mainSidebarRecent) => set({ mainSidebarRecent }),
      setMainSidebarSubscribed: (mainSidebarSubscribed) =>
        set({ mainSidebarSubscribed }),
      setMainSidebarModerating: (mainSidebarModerating) =>
        set({ mainSidebarModerating }),

      // Site sidebar
      setSiteAboutExpanded: (siteAboutExpanded) => set({ siteAboutExpanded }),
      setSiteAdminsExpanded: (siteAdminsExpanded: boolean) =>
        set({ siteAdminsExpanded }),

      // Community sidebar
      setCommunityAboutExpanded: (communityAboutExpanded: boolean) =>
        set({ communityAboutExpanded }),
      setCommunityFlairsExpanded: (communityFlairsExpanded: boolean) =>
        set({ communityFlairsExpanded }),
      setCommunityModsExpanded: (communityModsExpanded: boolean) =>
        set({ communityModsExpanded }),

      // User sidebar
      setPersonBioExpanded: (personBioExpanded: boolean) =>
        set({ personBioExpanded }),

      // Search
      setRecentSearchesExpanded: (recentSearchesExpanded) =>
        set({ recentSearchesExpanded }),

      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "sidebar",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 1,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
    },
  ),
);
