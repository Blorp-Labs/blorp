import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { MAX_CACHE_MS } from "./config";
import { CachePrefixer } from "./auth";
import { Schemas } from "../lib/lemmy/adapters/api-blueprint";

type CachedComment = {
  data: Schemas.Comment;
  remove?: boolean;
  lastUsed: number;
};

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
  cleanup: () => any;
};
export const useCommentsStore = create<SortsStore>()(
  persist(
    (set, get) => ({
      comments: {},
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

        return comments;
      },
    }),
    {
      name: "comments",
      storage: createStorage<SortsStore>(),
      version: 2,
      onRehydrateStorage: () => {
        return (state) => {
          state?.cleanup();
        };
      },
    },
  ),
);

sync(useCommentsStore);
