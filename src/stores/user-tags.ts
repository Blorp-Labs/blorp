import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import z from "zod";
import { isTest } from "../lib/device";
import { mergeCacheObject } from "./utils";

const persistedSchema = z.object({
  userTags: z.record(z.string(), z.string()),
});

type InboxStore = {
  setUserTag: (userSlug: string, tag: string) => any;
  reset: () => void;
} & z.infer<typeof persistedSchema>;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  userTags: {},
};

export const useTagUserStore = create<InboxStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      setUserTag: (userSlug, tag) => {
        const prev = get().userTags;
        if (!tag.trim()) {
          const clone = { ...prev };
          delete clone[userSlug];
          set({ userTags: clone });
        } else {
          set({
            userTags: {
              ...prev,
              [userSlug]: tag.trim(),
            },
          });
        }
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "user-tags",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 0,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<InboxStore>;
        return {
          ...current,
          ...persisted,
          userTags: mergeCacheObject(
            current.userTags,
            persisted.userTags,
            z.string(),
          ),
        } satisfies InboxStore;
      },
    },
  ),
);

sync(useTagUserStore);
