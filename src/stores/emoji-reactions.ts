import { create } from "zustand";
import { persist } from "zustand/middleware";
import z from "zod";
import { createStorage, sync } from "./storage";
import { isTest } from "../lib/device";

export const MAX_RECENT_EMOJI = 40;

const persistedSchema = z.object({
  recentlyUsed: z.array(z.string()),
});

type EmojiReactionStore = z.infer<typeof persistedSchema> & {
  addRecentEmoji: (emoji: string) => void;
  reset: () => void;
};

const INIT_STATE: z.infer<typeof persistedSchema> = {
  recentlyUsed: [],
};

export const useEmojiReactionStore = create<EmojiReactionStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      addRecentEmoji: (emoji) => {
        const prev = get().recentlyUsed.filter((e) => e !== emoji);
        set({ recentlyUsed: [emoji, ...prev].slice(0, MAX_RECENT_EMOJI) });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "emoji-reactions",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 0,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<z.infer<typeof persistedSchema>>;
        return {
          ...current,
          recentlyUsed: (persisted.recentlyUsed ?? []).filter(
            (e): e is string => typeof e === "string",
          ),
        } satisfies EmojiReactionStore;
      },
    },
  ),
);

sync(useEmojiReactionStore);
