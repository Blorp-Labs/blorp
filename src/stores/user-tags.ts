import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import z from "zod";
import { isTest } from "../lib/device";
import { mergeCacheObject } from "./utils";

type InboxStore = {
  userTags: Record<string, string>;
  setUserTag: (userHandle: string, tag: string) => any;
  reset: () => void;
};

const INIT_STATE = {
  userTags: {} satisfies Record<string, string>,
};

export const useTagUserStore = create<InboxStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      setUserTag: (userHandle, tag) => {
        const prev = get().userTags;
        if (!tag.trim()) {
          const clone = { ...prev };
          delete clone[userHandle];
          set({ userTags: clone });
        } else {
          set({
            userTags: {
              ...prev,
              [userHandle]: tag.trim(),
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
      storage: createStorage<InboxStore>(),
      version: 0,
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
