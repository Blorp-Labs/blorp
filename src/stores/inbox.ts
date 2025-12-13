import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";

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
};

export const useInboxStore = create<InboxStore>()(
  persist(
    (set) => ({
      inboxType: "all",
      setInboxType: (inboxType) => set({ inboxType }),
    }),
    {
      name: "inbox",
      storage: createStorage<InboxStore>(),
      version: 0,
    },
  ),
);

sync(useInboxStore);
