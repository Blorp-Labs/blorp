import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { isTest } from "../lib/device";

type Type =
  | "all"
  | "unread"
  | "mentions"
  | "replies"
  | "post-reports"
  | "comment-reports";

type InboxStore = {
  inboxType: Type;
  setInboxType: (type: Type) => any;
  reset: () => void;
};

const INIT_STATE = {
  inboxType: "all" as const satisfies Type,
};

export const useInboxStore = create<InboxStore>()(
  persist(
    (set) => ({
      ...INIT_STATE,
      setInboxType: (inboxType) => set({ inboxType }),
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "inbox",
      storage: createStorage<InboxStore>(),
      version: 0,
    },
  ),
);

sync(useInboxStore);
