import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { isTest } from "../lib/device";
import _ from "lodash";

type PostCardStyle = "small" | "large" | "extra-small";

export const POST_CARD_STYLE_OPTIONS: {
  label: string;
  value: PostCardStyle;
}[] = [
  {
    value: "large",
    label: "Card",
  },
  {
    value: "small",
    label: "Compact",
  },
  {
    value: "extra-small",
    label: "Extra Compact",
  },
];

export type ShareLinkType = "blorp" | "source" | "instance" | "lemmyverse";

export const SHARE_LINK_TYPE_OPTIONS: {
  label: string;
  value: ShareLinkType;
}[] = [
  { value: "blorp", label: "Blorp" },
  { value: "source", label: "Source" },
  { value: "instance", label: "My Instance" },
  { value: "lemmyverse", label: "Lemmyverse" },
];

type SettingsStore = {
  postCardStyle: PostCardStyle;
  setPostCardStyle: (newVal: PostCardStyle) => any;
  leftHandedMode: boolean;
  setLeftHandedMode: (newVal: boolean) => any;
  reduceMotion: boolean;
  setReduceMotion: (newVal: boolean) => any;
  disableHaptics: boolean;
  setDisableHaptics: (newVal: boolean) => any;
  showMarkdown: boolean;
  setShowMarkdown: (newVal: boolean) => any;
  hideRead: boolean;
  setHideRead: (newVal: boolean) => any;
  hideBotPosts: boolean;
  setHideBotPosts: (newVal: boolean) => any;
  shareLinkType: ShareLinkType | null;
  setShareLinkType: (newVal: ShareLinkType) => any;
  filterKeywords: string[];
  setFilterKeywords: (update: { index: number; keyword: string }) => any;
  pruneFiltersKeywords: () => any;
  reset: () => void;
};

const INIT_STATE = {
  postCardStyle: "large",
  leftHandedMode: false,
  reduceMotion: false,
  disableHaptics: false,
  showMarkdown: false,
  hideRead: false,
  hideBotPosts: false,
  shareLinkType: null,
  filterKeywords: [],
} satisfies Partial<SettingsStore>;

function pruneFilterKeywords(keywords: string[]) {
  return _.uniq(keywords.filter(Boolean));
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      setPostCardStyle: (postCardStyle) => set({ postCardStyle }),
      setLeftHandedMode: (leftHandedMode) => set({ leftHandedMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setDisableHaptics: (disableHaptics) => set({ disableHaptics }),
      setShowMarkdown: (showMarkdown) => set({ showMarkdown }),
      setHideRead: (hideRead) => set({ hideRead }),
      setHideBotPosts: (hideBotPosts) => set({ hideBotPosts }),
      setShareLinkType: (shareLinkType) => set({ shareLinkType }),
      setFilterKeywords: (update) => {
        const filterKeywords = [...get().filterKeywords];
        filterKeywords[update.index] = update.keyword;
        set({
          filterKeywords,
        });
      },
      pruneFiltersKeywords: () => {
        set({ filterKeywords: pruneFilterKeywords(get().filterKeywords) });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "settings",
      storage: createStorage<SettingsStore>(),
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version === 0) {
          persisted.shareLinkType = null;
        }
        return persisted;
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<SettingsStore>;
        return {
          ...current,
          ...persisted,
          filterKeywords: pruneFilterKeywords([
            ...(persisted.filterKeywords ?? []),
            ...current.filterKeywords,
          ]),
        } satisfies SettingsStore;
      },
    },
  ),
);

sync(useSettingsStore);
