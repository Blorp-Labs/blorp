import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";

type SidebarStore = {
  // Main (left) sidebar
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
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      // Main sidebar
      mainSidebarRecent: true,
      setMainSidebarRecent: (mainSidebarRecent) => set({ mainSidebarRecent }),
      mainSidebarSubscribed: true,
      setMainSidebarSubscribed: (mainSidebarSubscribed) =>
        set({ mainSidebarSubscribed }),
      mainSidebarModerating: true,
      setMainSidebarModerating: (mainSidebarModerating) =>
        set({ mainSidebarModerating }),

      // Site sidebar
      siteAboutExpanded: true,
      setSiteAboutExpanded: (siteAboutExpanded) => set({ siteAboutExpanded }),
      siteAdminsExpanded: true,
      setSiteAdminsExpanded: (siteAdminsExpanded: boolean) =>
        set({ siteAdminsExpanded }),

      // Community sidebar
      communityAboutExpanded: true,
      setCommunityAboutExpanded: (communityAboutExpanded: boolean) =>
        set({ communityAboutExpanded }),
      communityFlairsExpanded: true,
      setCommunityFlairsExpanded: (communityFlairsExpanded: boolean) =>
        set({ communityFlairsExpanded }),
      communityModsExpanded: true,
      setCommunityModsExpanded: (communityModsExpanded: boolean) =>
        set({ communityModsExpanded }),

      // User sidebar
      personBioExpanded: true,
      setPersonBioExpanded: (personBioExpanded: boolean) =>
        set({ personBioExpanded }),

      // Search
      recentSearchesExpanded: true,
      setRecentSearchesExpanded: (recentSearchesExpanded) =>
        set({ recentSearchesExpanded }),
    }),
    {
      name: "sidebar",
      storage: createStorage<SidebarStore>(),
      version: 1,
    },
  ),
);

sync(useSidebarStore);
