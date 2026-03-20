import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { useConfirmationAlert } from "../lib/hooks";
import z from "zod";
import { isTest } from "../lib/device";

type InboxStore = {
  userTags: Record<string, string>;
  setUserTag: (userSlug: string, tag: string) => any;
  reset: () => void;
};

const INIT_STATE = {
  userTags: {} as Record<string, string>,
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
      storage: createStorage<InboxStore>(),
      version: 0,
      merge: (p: any, current) => {
        const persisted = p as Partial<InboxStore>;
        return {
          ...current,
          ...persisted,
          userTags: {
            ...current.userTags,
            ...persisted.userTags,
          },
        } satisfies InboxStore;
      },
    },
  ),
);

sync(useTagUserStore);

export function useTagUser() {
  const setUserTag = useTagUserStore((s) => s.setUserTag);
  const alrt = useConfirmationAlert();

  return async (userSlug: string, initValue?: string) => {
    const { tag } = await alrt({
      header: userSlug,
      message: "Tag user to identify them later",
      inputs: [
        {
          type: "text",
          name: "tag",
          id: "tag",
          value: initValue,
        },
      ],
      schema: z.object({
        tag: z.string(),
      }),
    });
    setUserTag(userSlug, tag);
  };
}
