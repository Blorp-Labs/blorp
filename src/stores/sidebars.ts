import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage } from "./storage";
import { isTest } from "../lib/device";

type SidebarStore = {
  // Main (left) sidebar
  mainSidebarCollapsed: boolean;
  setMainSidebarCollapsed: (val: boolean) => void;

  mainSidebarRecent: boolean;
  setMainSidebarRecent: (val: boolean) => void;
  mainSidebarSubscribed: boolean;
  setMainSidebarSubscribed: (val: boolean) => void;
  mainSidebarModerating: boolean;
  setMainSidebarModerating: (val: boolean) => void;

  // Site sidebar
  siteAboutExpanded: boolean;
  setSiteAboutExpanded: (val: boolean) => void;
  siteAdminsExpanded: boolean;
  setSiteAdminsExpanded: (val: boolean) => void;

  // Community sidebar
  communityAboutExpanded: boolean;
  setCommunityAboutExpanded: (val: boolean) => void;
  communityFlairsExpanded: boolean;
  setCommunityFlairsExpanded: (val: boolean) => void;
  communityModsExpanded: boolean;
  setCommunityModsExpanded: (val: boolean) => void;

  // User sidebar
  personBioExpanded: boolean;
  setPersonBioExpanded: (val: boolean) => void;

  // Search
  recentSearchesExpanded: boolean;
  setRecentSearchesExpanded: (val: boolean) => void;

  reset: () => void;
};

const INIT_STATE = {
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
      storage: createStorage<SidebarStore>(),
      version: 1,
    },
  ),
);
