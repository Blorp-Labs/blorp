import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { isTest } from "../lib/device";
import _ from "lodash";
import { env } from "../env";

export type PostCardStyle = "small" | "large" | "extra-small";

export type DarkMode = "system" | "dark" | "light";

export type LightTheme = "default-light" | "dracula-light";
export type DarkTheme = "default-dark" | "dracula-dark";

export const LIGHT_THEME_OPTIONS: { label: string; value: LightTheme }[] = [
  { value: "default-light", label: "Default" },
  { value: "dracula-light", label: "Dracula" },
];

export const DARK_THEME_OPTIONS: { label: string; value: DarkTheme }[] = [
  { value: "default-dark", label: "Default" },
  { value: "dracula-dark", label: "Dracula" },
];

// How vote counts are displayed in the UI.
// "score"    → combined score in the middle between buttons
// "upvotes"  → upvote count on the left, separator before downvote button
// "downvotes"→ downvote count on the right, separator after upvote button
// "none"     → no count shown, heart button instead of up/down arrows
export type ScoreDisplay = "none" | "score" | "upvotes" | "downvotes";

// App-level vote display override. "account" defers to account/server settings.
export type VoteDisplaySetting = "account" | ScoreDisplay;

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

export type ThresholdSetting = "account" | -5 | -10 | -15 | -20;
export const THRESHOLD_OPTIONS: ThresholdSetting[] = [
  "account",
  -5,
  -10,
  -15,
  -20,
];

export type ShareLinkType = "blorp" | "instance" | "threadiverse.link";

export const SHARE_LINK_TYPE_OPTIONS: {
  label: string;
  value: ShareLinkType;
}[] = [
  { value: "blorp", label: `${env.REACT_APP_NAME} (${window.location.host})` },
  { value: "threadiverse.link", label: "threadiverse.link" },
  { value: "instance", label: "My Instance" },
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
  paginationMode: "infinite" | "pages";
  setPaginationMode: (mode: "infinite" | "pages") => void;
  darkMode: DarkMode;
  setDarkMode: (mode: DarkMode) => void;
  // App stores (e.g. iOS) may prohibit showing NSFW settings by default.
  // We track whether any account ever had NSFW enabled so users can
  // re-enable it in-app after turning it off, without needing to go to
  // the web interface. The flag is set automatically when getSite() finds
  // an account with showNsfw=true, and is never cleared programmatically.
  nsfwPreviouslyEnabled: boolean;
  setNsfwPreviouslyEnabled: (value: boolean) => void;
  voteDisplaySetting: VoteDisplaySetting;
  setVoteDisplaySetting: (newVal: VoteDisplaySetting) => void;
  collapseThresholdSetting: ThresholdSetting;
  setCollapseThresholdSetting: (newVal: ThresholdSetting) => void;
  hideThresholdSetting: ThresholdSetting;
  setHideThresholdSetting: (newVal: ThresholdSetting) => void;
  collapseRemovedComments: boolean;
  setCollapseRemovedComments: (newVal: boolean) => void;
  lightTheme: LightTheme;
  setLightTheme: (newVal: LightTheme) => void;
  darkTheme: DarkTheme;
  setDarkTheme: (newVal: DarkTheme) => void;
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
  paginationMode: "infinite",
  darkMode: "system",
  nsfwPreviouslyEnabled: false,
  voteDisplaySetting: "account",
  collapseThresholdSetting: -10,
  hideThresholdSetting: "account",
  collapseRemovedComments: true,
  lightTheme: "default-light",
  darkTheme: "default-dark",
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
      setPaginationMode: (paginationMode) => set({ paginationMode }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setNsfwPreviouslyEnabled: (nsfwPreviouslyEnabled) =>
        set({ nsfwPreviouslyEnabled }),
      setVoteDisplaySetting: (voteDisplaySetting) =>
        set({ voteDisplaySetting }),
      setCollapseThresholdSetting: (collapseThresholdSetting) =>
        set({ collapseThresholdSetting }),
      setHideThresholdSetting: (hideThresholdSetting) =>
        set({ hideThresholdSetting }),
      setCollapseRemovedComments: (collapseRemovedComments) =>
        set({ collapseRemovedComments }),
      setLightTheme: (lightTheme) => set({ lightTheme }),
      setDarkTheme: (darkTheme) => set({ darkTheme }),
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
