import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import { isTest } from "../lib/device";
import z from "zod";

const inboxType = z.enum([
  "all",
  "unread",
  "mentions",
  "replies",
  "post-reports",
  "comment-reports",
]);

type InboxType = z.infer<typeof inboxType>;

const persistedSchema = z.object({
  inboxType,
});

type InboxStore = {
  setInboxType: (type: InboxType) => any;
  reset: () => void;
} & z.infer<typeof persistedSchema>;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  inboxType: "all",
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
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 0,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
    },
  ),
);

sync(useInboxStore);
