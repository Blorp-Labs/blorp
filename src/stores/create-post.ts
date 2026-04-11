import { Community } from "lemmy-v3";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import dayjs from "dayjs";
import z from "zod";
import {
  Forms,
  Schemas,
  editPostSchema,
  createPostSchema,
} from "../apis/api-blueprint";
import { isNotNil } from "../lib/utils";
import { isTest } from "../lib/device";
import { useMemo } from "react";
import { getFlairLookup } from "../apis/utils";
import { mergeCacheObject } from "./utils";

export type CommunityPartial = Pick<
  Community,
  "name" | "title" | "icon" | "actor_id"
>;

export const draftSchema = editPostSchema
  .merge(createPostSchema)
  .partial()
  .extend({
    type: z.enum(["text", "media", "link", "poll"]),
    createdAt: z.number(),
    communityApId: z.string().optional(),
  });

export type Draft = z.infer<typeof draftSchema>;

const persistedSchema = z.object({
  drafts: z.record(draftSchema),
});

type CreatePostStore = z.infer<typeof persistedSchema> & {
  updateDraft: (key: string, patch: Partial<Draft>) => void;
  deleteDraft: (key: string) => any;
  cleanup: () => void;
  reset: () => void;
};

const INIT_STATE: z.infer<typeof persistedSchema> = {
  drafts: {},
};

export const NEW_DRAFT: Draft = {
  type: "text",
  createdAt: Date.now(),
};

export function isEmptyDraft(draft: Draft) {
  const fields = _.omit(draft, [
    "type",
    "apId",
    "createdAt",
    "communityHandle",
    "communityApId",
    "poll",
  ]);
  if (
    draft.poll &&
    draft.poll.choices.map((c) => c.text.trim()).join("") !== ""
  ) {
    return false;
  }
  for (const id in fields) {
    const field = fields[id as keyof typeof fields];
    if (_.isArray(field)) {
      if (field.length > 0) {
        return false;
      }
    } else if (field) {
      return false;
    }
  }
  return true;
}

export function postToDraft(
  post: Schemas.Post,
  flairs?: Schemas.Flair[] | null,
): Draft {
  return {
    title: post.title,
    body: post.body ?? "",
    communityHandle: post.communityHandle,
    createdAt: dayjs(post.createdAt).toDate().valueOf(),
    type: post.url
      ? "link"
      : post.thumbnailUrl
        ? "media"
        : post.poll
          ? "poll"
          : "text",
    apId: post.apId,
    thumbnailUrl: post.thumbnailUrl,
    altText: post.altText,
    url: post.url,
    flairs: flairs ?? undefined,
    poll: post.poll
      ? {
          endAmount: 1,
          endUnit: "days",
          mode: post.poll.mode,
          localOnly: post.poll.localOnly,
          choices: post.poll.choices.map((c, i) => ({
            id: c.id,
            text: c.text,
            sortOrder: i,
          })),
        }
      : undefined,
  };
}

export function draftToEditPostData(draft: Draft): Forms.EditPost {
  const { title, apId, communityHandle } = draft;
  if (!title) {
    throw new Error("post name is required");
  }
  if (!apId) {
    throw new Error("apId name is required");
  }
  if (!communityHandle) {
    throw new Error("community is required");
  }
  const post: Forms.EditPost = {
    ...draft,
    title,
    apId,
    thumbnailUrl: draft.thumbnailUrl ?? null,
    url: draft.url ?? null,
    body: draft.body ?? null,
    nsfw: draft.nsfw ?? null,
    altText: draft.altText ?? null,
  };

  switch (draft.type) {
    case "text":
      post.url = null;
      post.thumbnailUrl = null;
      break;
    case "media":
      post.url = post.thumbnailUrl;
      break;
    case "poll":
      // PieFed will drop poll if url exists
      post.url = null;
      post.thumbnailUrl = null;
      if (post.poll) {
        post.poll = {
          ...post.poll,
          choices: post.poll.choices
            .filter((c) => c.text.trim().length > 0)
            .map((c, i) => ({ ...c, sortOrder: i })),
        };
      }
      break;
    case "link":
  }

  if (!post.url) {
    post.url = null;
  }
  if (!post.thumbnailUrl) {
    post.thumbnailUrl = null;
  }

  return post;
}

export function draftToCreatePostData(draft: Draft): Forms.CreatePost {
  const { title, communityHandle } = draft;
  if (!title) {
    throw new Error("post name is required");
  }
  if (!communityHandle) {
    throw new Error("community is required");
  }
  const post: Forms.CreatePost = {
    ...draft,
    title,
    communityHandle,
    body: draft.body ?? null,
    url: draft.url ?? null,
    nsfw: draft.nsfw ?? null,
    thumbnailUrl: draft.thumbnailUrl ?? null,
    altText: draft.altText ?? null,
  };

  switch (draft.type) {
    case "text":
      post.url = null;
      post.thumbnailUrl = null;
      break;
    case "media":
      post.url = post.thumbnailUrl;
      break;
    case "poll":
      // PieFed will drop poll if url exists
      post.url = null;
      post.thumbnailUrl = null;
      if (post.poll) {
        post.poll = {
          ...post.poll,
          choices: post.poll.choices
            .filter((c) => c.text.trim().length > 0)
            .map((c, i) => ({
              ...c,
              sortOrder: i,
            })),
        };
      }
      break;
    case "link":
  }

  if (!post.url) {
    post.url = null;
  }
  if (!post.thumbnailUrl) {
    post.thumbnailUrl = null;
  }

  return post;
}

export function migrateCreatePostStore(
  state: Record<string, unknown>,
): z.infer<typeof persistedSchema> {
  const drafts = (state["drafts"] ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const migratedDrafts: Record<string, Record<string, unknown>> = {};
  for (const [key, draft] of Object.entries(drafts)) {
    if (draft && typeof draft === "object") {
      const { communitySlug, ...rest } = draft;
      migratedDrafts[key] = {
        ...rest,
        ...(communitySlug && !rest["communityHandle"]
          ? { communityHandle: communitySlug }
          : {}),
      };
    }
  }
  return persistedSchema.parse({ ...state, drafts: migratedDrafts });
}

export const useCreatePostStore = create<CreatePostStore>()(
  persist(
    (set) => ({
      ...INIT_STATE,
      updateDraft: (key, patch) => {
        set((prev) => {
          const drafts = { ...prev.drafts };
          const prevDraft = drafts[key] ?? NEW_DRAFT;
          drafts[key] = {
            ...prevDraft,
            ...patch,
          };
          // Clear flairs on community change
          if (
            isNotNil(patch.communityHandle) &&
            _.isNil(patch.flairs) &&
            prevDraft.communityHandle !== patch.communityHandle
          ) {
            drafts[key].flairs = [];
          } else {
            drafts[key].flairs = drafts[key].flairs?.map((f) =>
              _.pick(f, ["title", "apId"]),
            );
          }
          return {
            ...prev,
            drafts,
          };
        });
      },
      deleteDraft: (key: string) => {
        set((prev) => {
          const drafts = { ...prev.drafts };
          delete drafts[key];
          return {
            ...prev,
            drafts,
          };
        });
      },
      cleanup: () => {
        set((prev) => {
          const drafts = { ...prev.drafts };
          for (const key in drafts) {
            if (drafts[key] && isEmptyDraft(drafts[key])) {
              delete drafts[key];
            }
          }
          return {
            ...prev,
            drafts,
          };
        });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "create-post",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 6,
      migrate: (state, version) => {
        if (version < 6) {
          return migrateCreatePostStore(state as Record<string, unknown>);
        }
        return state as z.infer<typeof persistedSchema>;
      },
      onRehydrateStorage: () => {
        return (state) => {
          if (!alreadyClean) {
            state?.cleanup();
            alreadyClean = true;
          }
        };
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<CreatePostStore>;
        return {
          ...current,
          ...persisted,
          drafts: mergeCacheObject(
            current.drafts,
            persisted.drafts,
            draftSchema,
          ),
        } satisfies CreatePostStore;
      },
    },
  ),
);

let alreadyClean = false;

sync(useCreatePostStore);

export function useFlairLookup(flairs?: Schemas.Flair[] | null) {
  return useMemo(() => getFlairLookup(flairs), [flairs]);
}
