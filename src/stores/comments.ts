import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { CachePrefixer, useAuth } from "./auth";
import { Schemas, commentSchema } from "../apis/api-blueprint";
import { useShallow } from "zustand/shallow";
import { isNotNil } from "../lib/utils";
import { isTest } from "../lib/device";
import z from "zod";
import { mergeCacheObject } from "./utils";

const cachedCommentSchema = z.object({
  data: commentSchema,
  remove: z.boolean().optional(),
  lastUsed: z.number(),
});

type CachedComment = z.infer<typeof cachedCommentSchema>;

type CommentPath = Schemas.Comment["path"];

type SortsStore = {
  comments: Record<CommentPath, CachedComment>;
  patchComment: (
    path: CommentPath,
    prefix: CachePrefixer,
    comment: (prev: Schemas.Comment) => Partial<Schemas.Comment>,
  ) => void;
  cacheComments: (
    prefix: CachePrefixer,
    comments: Schemas.Comment[],
  ) => Record<CommentPath, CachedComment>;
  markCommentForRemoval: (path: string, prefix: CachePrefixer) => void;
  cleanup: () => void;
  reset: () => void;
};

const INIT_STATE = {
  comments: {} satisfies Record<CommentPath, CachedComment>,
};

export const useCommentsStore = create<SortsStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      optimisticComments: {},
      patchComment: (path, prefix, patchFn) => {
        const prev = get().comments;
        const cacheKey = prefix(path);
        const prevComment = prev[cacheKey];
        if (!prevComment) {
          console.log("attempted to patch a comment that is not in the cache");
          return;
        }
        const updatedCommentData = {
          ...prevComment.data,
          ...patchFn(prevComment.data),
        };
        if (prevComment) {
          set({
            comments: {
              ...prev,
              [cacheKey]: {
                data: updatedCommentData,
                lastUsed: Date.now(),
              },
            },
          });
        }
        return updatedCommentData;
      },
      markCommentForRemoval: (path, prefix) => {
        const commentsClone = get().comments;
        const cacheKey = prefix(path);
        if (commentsClone[cacheKey]) {
          commentsClone[cacheKey].remove = true;
        }
        set({
          comments: commentsClone,
        });
      },
      cacheComments: (prefix, views) => {
        const prev = get().comments;

        const newComments: Record<CommentPath, CachedComment> = {};

        for (const view of views) {
          const cacheKey = prefix(view.path);
          const prevCommentData = prev[cacheKey]?.data ?? {};
          newComments[cacheKey] = {
            data: {
              ...prevCommentData,
              ...view,
            },
            lastUsed: Date.now(),
          };
        }

        const updatedPosts = {
          ...prev,
          ...newComments,
        };

        set({
          comments: updatedPosts,
        });

        return updatedPosts;
      },
      cleanup: () => {
        const now = Date.now();

        const comments = _.clone(get().comments);

        for (const key in comments) {
          const comment = comments[key];
          if (comment) {
            const shouldEvict = now - comment.lastUsed > MAX_CACHE_MS;
            if (shouldEvict || comment.remove) {
              delete comments[key];
            }
          }
        }

        set({ comments });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "comments",
      storage: createStorage<SortsStore>(),
      version: 3,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
      merge: (p: any, current) => {
        const persisted = p as Partial<SortsStore>;
        return {
          ...current,
          ...persisted,
          comments: mergeCacheObject(
            current.comments,
            persisted.comments,
            cachedCommentSchema,
          ),
        } satisfies SortsStore;
      },
    },
  ),
);

sync(useCommentsStore);

export function useCommentsByPaths(ps: string[]) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useCommentsStore(
    useShallow((s) =>
      ps.map((p) => s.comments[getCachePrefixer()(p)]?.data).filter(isNotNil),
    ),
  );
}
