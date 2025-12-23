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

type SettingsStore = {
  postCardStyle: PostCardStyle;
  setPostCardStyle: (newVal: PostCardStyle) => any;
  leftHandedMode: boolean;
  setLeftHandedMode: (newVal: boolean) => any;
  showMarkdown: boolean;
  setShowMarkdown: (newVal: boolean) => any;
  hideRead: boolean;
  setHideRead: (newVal: boolean) => any;
  hideBotPosts: boolean;
  setHideBotPosts: (newVal: boolean) => any;
  filterKeywords: string[];
  setFilterKeywords: (update: { index: number; keyword: string }) => any;
  pruneFiltersKeywords: () => any;
  reset: () => void;
};

const INIT_STATE = {
  postCardStyle: "large",
  leftHandedMode: false,
  showMarkdown: false,
  hideRead: false,
  hideBotPosts: false,
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
      setShowMarkdown: (showMarkdown) => set({ showMarkdown }),
      setHideRead: (hideRead) => set({ hideRead }),
      setHideBotPosts: (hideBotPosts) => set({ hideBotPosts }),
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
      version: 0,
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
