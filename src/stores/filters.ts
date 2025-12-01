import { ListingType } from "lemmy-v3";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { isTest } from "../lib/device";

type CommunityListingType =
  | "All"
  | "Local"
  | "Subscribed"
  | "ModeratorView"
  | "All Feeds";

type SortsStore = {
  communitySort: string;
  setCommunitySort: (sort: string) => void;
  commentSort: string;
  setCommentSort: (sort: string) => void;
  postSort: string;
  setPostSort: (sort: string) => void;
  listingType: ListingType;
  setListingType: (type: ListingType) => void;
  communitiesListingType: CommunityListingType;
  setCommunitiesListingType: (type: CommunityListingType) => void;
  reset: () => void;
};

const INIT_STATE = {
  communitySort: "TopAll",
  commentSort: "Hot",
  postSort: "Active",
  listingType: "All",
} as const;

export const useFiltersStore = create<SortsStore>()(
  persist(
    (set) => ({
      ...INIT_STATE,
      setCommunitySort: (communitySort) => set({ communitySort }),
      setCommentSort: (commentSort) => set({ commentSort }),
      setPostSort: (postSort) => set({ postSort }),
      setListingType: (listingType) =>
        set({
          listingType,
        }),
      communitiesListingType: "All",
      setCommunitiesListingType: (communitiesListingType) =>
        set({
          communitiesListingType,
        }),
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "filters",
      storage: createStorage<SortsStore>(),
      version: 0,
    },
  ),
);

sync(useFiltersStore);
