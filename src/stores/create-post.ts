import { Community } from "lemmy-v3";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import dayjs from "dayjs";
import { Forms, Schemas } from "../lib/api/adapters/api-blueprint";

export type CommunityPartial = Pick<
  Community,
  "name" | "title" | "icon" | "actor_id"
>;

export interface Draft extends Partial<Forms.EditPost & Forms.CreatePost> {
  type: "text" | "media" | "link";
  createdAt: number;
}

type CreatePostStore = {
  drafts: Record<string, Draft>;
  updateDraft: (key: string, patch: Partial<Draft>) => void;
  deleteDraft: (key: string) => any;
  cleanup: () => void;
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
    "communitySlug",
    "communityApId",
  ]);
  for (const id in fields) {
    if (fields[id as keyof typeof fields]) {
      return false;
    }
  }
  return true;
}

export function postToDraft(post: Schemas.Post): Draft {
  return {
    title: post.title,
    body: post.body ?? "",
    communitySlug: post.communitySlug,
    createdAt: dayjs(post.createdAt).toDate().valueOf(),
    type: "text",
    apId: post.apId,
    thumbnailUrl: post.thumbnailUrl,
    altText: post.altText,
  };
}

export function draftToEditPostData(draft: Draft): Forms.EditPost {
  const { title, apId, communitySlug } = draft;
  if (!title) {
    throw new Error("post name is required");
  }
  if (!apId) {
    throw new Error("apId name is required");
  }
  if (!communitySlug) {
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
  const { title, communitySlug } = draft;
  if (!title) {
    throw new Error("post name is required");
  }
  if (!communitySlug) {
    throw new Error("community is required");
  }
  const post: Forms.CreatePost = {
    ...draft,
    title,
    communitySlug,
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

export const useCreatePostStore = create<CreatePostStore>()(
  persist(
    (set) => ({
      drafts: {},
      updateDraft: (key, patch) => {
        set((prev) => {
          const drafts = { ...prev.drafts };
          const prevDraft = drafts[key] ?? NEW_DRAFT;
          drafts[key] = {
            ...prevDraft,
            ...patch,
          };
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
    }),
    {
      name: "create-post",
      storage: createStorage<CreatePostStore>(),
      version: 5,
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
          drafts: {
            ...current.drafts,
            ...persisted.drafts,
          },
        } satisfies CreatePostStore;
      },
    },
  ),
);

let alreadyClean = false;

sync(useCreatePostStore);
