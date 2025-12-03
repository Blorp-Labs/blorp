import { usePostsStore } from "@/src/stores/posts";
import { useApiClients, usePostsKey } from ".";
import { ApiBlueprint, Schemas } from "./adapters/api-blueprint";
import { useAuth } from "@/src/stores/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isErrorLike } from "../utils";
import { extractErrorContent } from "./utils";
import { toast } from "sonner";

function createPostMutation<
  ApiFn extends keyof ApiBlueprint<any>,
  Form extends Parameters<ApiBlueprint<any>[ApiFn]>[0],
>(config: {
  apiFn: ApiFn;
  key: keyof Form & string;
  optimisticKey: keyof Schemas.Post;
  formatError: (form: Form) => string;
  invalidateSavedPosts?: boolean;
}) {
  const { apiFn, key, optimisticKey, formatError } = config;
  return () => {
    const { api } = useApiClients();
    const patchPost = usePostsStore((s) => s.patchPost);
    const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
    const savedPostsQueryKey = usePostsKey({
      savedOnly: true,
    });
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (form: Form & { postApId: string }) =>
        (await api)[apiFn](form),
      onMutate: ({ [key]: field, postApId }) => {
        patchPost(postApId, getCachePrefixer(), {
          [optimisticKey]: field,
        });
      },
      onSuccess: (postView) => {
        if (config.invalidateSavedPosts) {
          queryClient.invalidateQueries({
            queryKey: savedPostsQueryKey,
          });
        }
        patchPost(postView.apId, getCachePrefixer(), {
          [optimisticKey]: undefined,
          ...postView,
        });
      },
      onError: (err, form) => {
        patchPost(form.postApId, getCachePrefixer(), {
          [optimisticKey]: undefined,
        });
        if (isErrorLike(err)) {
          toast.error(extractErrorContent(err));
        } else {
          toast.error(formatError(form));
        }
      },
    });
  };
}

export const useLockPost = createPostMutation({
  apiFn: "lockPost",
  key: "locked",
  optimisticKey: "optimisticLocked",
  formatError: ({ locked }) => `Couldn't ${locked ? "lock" : "unlock"} post`,
});

export const useFeaturePost = createPostMutation({
  apiFn: "featurePost",
  key: "featured",
  optimisticKey: "optimisticFeaturedCommunity",
  formatError: ({ featured }) => `Couldn't ${featured ? "pin" : "unpin"} post`,
});

export const useRemovePost = createPostMutation({
  apiFn: "removePost",
  key: "removed",
  optimisticKey: "optimisticRemoved",
  formatError: ({ removed }) =>
    `Couldn't ${removed ? "remove" : "restore"} post`,
});

// export const useMarkPostRead = createPostMutation({
//   apiFn: "markPostRead",
//   key: "read",
//   optimisticKey: "optimisticRead",
//   formatError: ({ read }) => `Couldn't mark post ${read ? "read" : "unread"}`,
// });

export const useDeletePost = createPostMutation({
  apiFn: "deletePost",
  key: "deleted",
  optimisticKey: "optimisticDeleted",
  formatError: ({ deleted }) =>
    `Couldn't ${deleted ? "deleted" : "restore"} post`,
});

export const useSavePost = createPostMutation({
  apiFn: "savePost",
  key: "save",
  optimisticKey: "optimisticSaved",
  formatError: ({ save }) => `Couldn't ${save ? "save" : "unsave"} post`,
  invalidateSavedPosts: true,
});

export const useLikePost = createPostMutation({
  apiFn: "likePost",
  key: "score",
  optimisticKey: "optimisticMyVote",
  formatError: ({ score }) => {
    let verb = "";
    switch (score) {
      case 0:
        verb = "upvote";
      case 1:
        verb = "unvote";
      case -1:
        verb = "downvote";
    }
    return `Couldn't ${verb} post`;
  },
});
