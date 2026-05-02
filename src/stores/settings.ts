import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { isCapacitor, isTest, isTauri } from "../lib/device";
import _ from "lodash";
import { env, lightThemeSchema, darkThemeSchema } from "../env";
import z from "zod";

export type PostCardStyle = "small" | "large" | "extra-small";

export type DarkMode = "system" | "dark" | "light";

export type LightTheme = z.infer<typeof lightThemeSchema>;
export type DarkTheme = z.infer<typeof darkThemeSchema>;

export const LIGHT_THEME_OPTIONS: { label: string; value: LightTheme }[] = [
  { value: "default-light", label: "Default" },
  { value: "dracula-light", label: "Dracula" },
  { value: "web-1.0-light", label: "Web 1.0" },
];

export const DARK_THEME_OPTIONS: { label: string; value: DarkTheme }[] = [
  { value: "default-dark", label: "Default" },
  { value: "dracula-dark", label: "Dracula" },
  { value: "web-1.0-dark", label: "Web 1.0" },
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

export type ThresholdSetting = "account" | number;
export const THRESHOLD_OPTIONS: ThresholdSetting[] = [
  "account",
  -5,
  -10,
  -15,
  -20,
];

export type ShareLinkType =
  | "blorp"
  | "instance"
  | "content-instance"
  | "threadiverse.link";

export const SHARE_LINK_TYPE_OPTIONS: {
  label: string;
  value: ShareLinkType;
}[] = [
  {
    value: "blorp",
    label:
      isCapacitor() || isTauri()
        ? env.REACT_APP_NAME
        : `${env.REACT_APP_NAME} (${window.location.host})`,
  },
  { value: "threadiverse.link", label: "threadiverse.link" },
  { value: "instance", label: "My Instance" },
  { value: "content-instance", label: "Content Instance" },
];

const persistedSchema = z.object({
  postCardStyle: z.enum(["small", "large", "extra-small"]),
  leftHandedMode: z.boolean(),
  reduceMotion: z.boolean(),
  disableHaptics: z.boolean(),
  showMarkdown: z.boolean(),
  hideRead: z.boolean(),
  hideSubscribedFromLocalAll: z.boolean(),
  hideBotPosts: z.boolean(),
  shareLinkType: z
    .enum(["blorp", "instance", "content-instance", "threadiverse.link"])
    .nullable(),
  filterKeywords: z.array(z.string()),
  paginationMode: z.enum(["infinite", "pages"]),
  darkMode: z.enum(["system", "dark", "light"]),
  nsfwPreviouslyEnabled: z.boolean(),
  contentWarningAccepted: z.boolean(),
  voteDisplaySetting: z.enum([
    "account",
    "none",
    "score",
    "upvotes",
    "downvotes",
  ]),
  collapseThresholdSetting: z.union([z.literal("account"), z.number()]),
  hideThresholdSetting: z.union([z.literal("account"), z.number()]),
  collapseRemovedComments: z.boolean(),
  lightTheme: lightThemeSchema,
  darkTheme: darkThemeSchema,
});

type SettingsStore = {
  setPostCardStyle: (newVal: PostCardStyle) => any;
  setLeftHandedMode: (newVal: boolean) => any;
  setReduceMotion: (newVal: boolean) => any;
  setDisableHaptics: (newVal: boolean) => any;
  setShowMarkdown: (newVal: boolean) => any;
  setHideRead: (newVal: boolean) => any;
  setHideSubscribedFromLocalAll: (newVal: boolean) => any;
  setHideBotPosts: (newVal: boolean) => any;
  setShareLinkType: (newVal: ShareLinkType) => any;
  setFilterKeywords: (update: { index: number; keyword: string }) => any;
  pruneFiltersKeywords: () => any;
  setPaginationMode: (mode: "infinite" | "pages") => void;
  setDarkMode: (mode: DarkMode) => void;
  // App stores (e.g. iOS) may prohibit showing NSFW settings by default.
  // We track whether any account ever had NSFW enabled so users can
  // re-enable it in-app after turning it off, without needing to go to
  // the web interface. The flag is set automatically when getSite() finds
  // an account with showNsfw=true, and is never cleared programmatically.
  setNsfwPreviouslyEnabled: (value: boolean) => void;
  setContentWarningAccepted: (value: boolean) => void;
  setVoteDisplaySetting: (newVal: VoteDisplaySetting) => void;
  setCollapseThresholdSetting: (newVal: ThresholdSetting) => void;
  setHideThresholdSetting: (newVal: ThresholdSetting) => void;
  setCollapseRemovedComments: (newVal: boolean) => void;
  setLightTheme: (newVal: LightTheme) => void;
  setDarkTheme: (newVal: DarkTheme) => void;
  reset: () => void;
} & z.infer<typeof persistedSchema>;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  postCardStyle: "large",
  leftHandedMode: false,
  reduceMotion: false,
  disableHaptics: false,
  showMarkdown: false,
  hideRead: false,
  hideSubscribedFromLocalAll: false,
  hideBotPosts: false,
  shareLinkType: null,
  filterKeywords: [],
  paginationMode: "infinite",
  darkMode: "system",
  nsfwPreviouslyEnabled: false,
  contentWarningAccepted: false,
  voteDisplaySetting: "account",
  collapseThresholdSetting: -10,
  hideThresholdSetting: "account",
  collapseRemovedComments: true,
  lightTheme: env.REACT_APP_DEFAULT_LIGHT_THEME,
  darkTheme: env.REACT_APP_DEFAULT_DARK_THEME,
};

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
      setHideSubscribedFromLocalAll: (hideSubscribedFromLocalAll) =>
        set({ hideSubscribedFromLocalAll }),
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
      setContentWarningAccepted: (contentWarningAccepted) =>
        set({ contentWarningAccepted }),
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
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 1,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
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
