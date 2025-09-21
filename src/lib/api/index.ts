import {
  useQuery,
  InfiniteData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useFiltersStore } from "@/src/stores/filters";
import {
  Account,
  getAccountSite,
  getCachePrefixer,
  parseAccountInfo,
  useAuth,
} from "../../stores/auth";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { usePostsStore } from "../../stores/posts";
import { useSettingsStore } from "../../stores/settings";
import { z } from "zod";
import { useCommentsStore } from "../../stores/comments";
import { useCommunitiesStore } from "../../stores/communities";
import { lemmyTimestamp } from "./utils";
import { useProfilesStore } from "@/src/stores/profiles";
import { useIonRouter } from "@ionic/react";
import { toast } from "sonner";
import {
  Draft,
  draftToCreatePostData,
  draftToEditPostData,
} from "@/src/stores/create-post";
import {
  isInfiniteQueryData,
  useThrottledInfiniteQuery,
} from "./throttled-infinite-query";
import { produce } from "immer";
import {
  Errors,
  Forms,
  INIT_PAGE_TOKEN,
  Schemas,
} from "./adapters/api-blueprint";
import { apiClient } from "./adapters/client";
import pTimeout from "p-timeout";
import { SetOptional } from "type-fest";
import { env } from "@/src/env";
import { isErrorLike, isNotNil, normalizeInstance } from "../utils";
import { compressImage } from "../image";
import { useFlairsStore } from "@/src/stores/flairs";
import { confetti } from "@/src/features/easter-eggs/confetti";
import { useHistory } from "@/src/routing";
import { getPostEmbed } from "../post";

enum Errors2 {
  OBJECT_NOT_FOUND = "couldnt_find_object",
}

function extractErrorContent(err: Error) {
  const content = err.message || err.name;
  return content ? _.capitalize(content.replaceAll("_", " ")) : "Unknown error";
}

export function useApiClients(config?: { instance?: string; jwt?: string }) {
  const accountIndex = useAuth((s) => s.accountIndex);
  const accounts = useAuth((s) => s.accounts);

  return useMemo(() => {
    const apis = accounts.map((a) => {
      const { instance, jwt } = a;
      const api = apiClient({ instance, jwt });

      const queryKeyPrefix: unknown[] = [
        `instance-${instance}`,
        `auth-${a.jwt ? "t" : "f"}`,
        `uuid-${a.uuid}`,
      ];

      return {
        api,
        queryKeyPrefix,
        isLoggedIn: !!a.jwt,
      };
    });

    const getInstanceOverride = () =>
      config?.instance
        ? {
            api: apiClient({ instance: config.instance, jwt: config.jwt }),
            queryKeyPrefix: [
              `instance-${config.instance}`,
              "auth-f",
              "uuid-null",
            ] as unknown[],
          }
        : null;

    const getDefaultInstance = () => ({
      api: apiClient({ instance: env.defaultInstance }),
      queryKeyPrefix: [
        `instance-${env.defaultInstance}`,
        "auth-f",
        "uuid-null",
      ] as unknown[],
    });

    return {
      apis,
      ...(getInstanceOverride() ?? apis[accountIndex] ?? getDefaultInstance()),
    };
  }, [accounts, accountIndex, config?.instance, config?.jwt]);
}

export function useSoftware() {
  const [software, setSoftware] = useState<"lemmy" | "piefed">();
  const { api } = useApiClients();

  useEffect(() => {
    let canceled = false;
    api.then((ready) => {
      if (!canceled) {
        setSoftware(ready.software);
      }
    });
    return () => {
      canceled = true;
    };
  }, [api]);

  return software;
}

export function usePersonDetails({
  actorId,
  enabled = true,
}: {
  actorId?: string;
  enabled?: boolean;
}) {
  const { api, queryKeyPrefix } = useApiClients();

  const queryKey = [...queryKeyPrefix, "getPersonDetails", actorId];

  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!actorId) {
        throw new Error("person_id undefined");
      }
      const person = await (
        await api
      ).getPerson(
        {
          apIdOrUsername: actorId,
        },
        { signal },
      );
      cacheProfiles(getCachePrefixer(), [person]);
      return {
        apId: person.apId,
      };
    },
    enabled: !!actorId && enabled,
  });
}

export function usePersonFeed({
  apIdOrUsername,
  type,
  sort,
}: SetOptional<Forms.GetPersonContent, "apIdOrUsername">) {
  const { api, queryKeyPrefix } = useApiClients();

  const postSort = useFiltersStore((s) => s.postSort);

  sort ??= postSort;

  const queryKey = [
    ...queryKeyPrefix,
    "getPersonFeed",
    { apIdOrUsername, type, sort },
  ];

  const cacheComments = useCommentsStore((s) => s.cacheComments);

  const cachePosts = usePostsStore((s) => s.cachePosts);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      if (!apIdOrUsername) {
        throw new Error("person_id undefined");
      }

      const { posts, comments, nextCursor } = await (
        await api
      ).getPersonContent(
        {
          apIdOrUsername,
          pageCursor: pageParam,
          type,
          sort,
        },
        { signal },
      );

      cachePosts(getCachePrefixer(), posts);
      cacheComments(getCachePrefixer(), comments);

      return {
        posts: posts.map((p) => p.apId),
        comments: comments.map((c) => c.path),
        next_page: nextCursor,
      };
    },
    enabled: !!apIdOrUsername,
    initialPageParam: INIT_PAGE_TOKEN,
    getNextPageParam: (data) => data.next_page,
  });
}

export function usePost({
  ap_id: apId,
  enabled,
}: {
  ap_id?: string;
  enabled?: boolean;
}) {
  const { api, queryKeyPrefix } = useApiClients();

  const queryKey = [...queryKeyPrefix, "getPost", apId];

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const initialData = usePostsStore((s) =>
    apId ? s.posts[getCachePrefixer()(apId)]?.data : undefined,
  );

  const cachePosts = usePostsStore((s) => s.cachePosts);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheFlairs = useFlairsStore((s) => s.cacheFlairs);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!apId) {
        throw new Error("ap_id undefined");
      }

      const { post, creator, community, flairs } = await (
        await api
      ).getPost({ apId }, { signal });

      cachePosts(getCachePrefixer(), [
        {
          ...post,
          // Fetching an individual post marks it
          // as read, but not until the next request
          // is made. We mark it as read here knowing
          // that on Lemmy's end it is now read.
          read: true,
        },
      ]);

      if (community) {
        cacheCommunities(getCachePrefixer(), [{ communityView: community }]);
      }
      if (creator) {
        cacheProfiles(getCachePrefixer(), [creator]);
      }
      if (flairs) {
        cacheFlairs(getCachePrefixer(), flairs);
      }

      return post;
    },
    retry: (count, err) => {
      const notFound = err.message === Errors2.OBJECT_NOT_FOUND;
      if (notFound) {
        return false;
      }
      return count <= 3;
    },
    enabled: !!apId && enabled,
    initialData,
    refetchOnMount: "always",
  });
}

function useCommentsKey() {
  const { queryKeyPrefix } = useApiClients();

  const commentSort = useFiltersStore((s) => s.commentSort);

  return (form: Forms.GetComments) => {
    const queryKey = [...queryKeyPrefix, "getComments"];

    if (form.postApId) {
      queryKey.push(`postApId-${form.postApId}`);
    }

    if (_.isNumber(form.parentId)) {
      queryKey.push(`parent-${form.parentId}`);
    }

    const sort = form.sort ?? commentSort;
    if (sort) {
      queryKey.push(`sort-${form.sort}`);
    }

    return queryKey;
  };
}

export function useComments(form: Forms.GetComments) {
  const commentSort = useFiltersStore((s) => s.commentSort);
  const sort = form.sort ?? commentSort;
  const { api } = useApiClients();

  form = {
    maxDepth: 6,
    sort,
    ...form,
  };

  const queryKey = useCommentsKey()(form);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);

  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { comments, creators, nextCursor } = await (
        await api
      ).getComments(
        {
          ...form,
          pageCursor: pageParam ?? undefined,
          sort,
        },
        {
          signal,
        },
      );

      cacheComments(getCachePrefixer(), comments);
      cacheProfiles(getCachePrefixer(), creators);

      return {
        comments,
        nextCursor,
      };
    },
    enabled: !_.isNil(form.postApId) || !_.isNil(form.savedOnly),
    getNextPageParam: (data) => data.nextCursor,
    initialPageParam: INIT_PAGE_TOKEN,
    refetchOnMount: "always",
  });
}

function usePostsKey(form?: Forms.GetPosts) {
  const { queryKeyPrefix } = useApiClients();

  const postSort = useFiltersStore((s) => s.postSort);
  const sort = form?.sort ?? postSort;

  const queryKey = [...queryKeyPrefix, sort];
  if (form) {
    queryKey.push(form);
  }

  return queryKey;
}

export function useMostRecentPost(
  featuredContext: "local" | "community",
  form: Forms.GetPosts,
) {
  const { api, queryKeyPrefix } = useApiClients();

  const postSort = useFiltersStore((s) => s.postSort);
  const sort = form.sort ?? postSort;

  const hideRead = useSettingsStore((s) => s.hideRead);

  form = {
    showRead: !hideRead,
    sort,
    ...form,
  } satisfies Forms.GetPosts;

  const query = useQuery({
    queryKey: [...queryKeyPrefix, "mostRecentPost", form],
    queryFn: async ({ signal }) =>
      (await api).getPosts(
        {
          ...form,
          sort: form.sort as any,
          type: form.type,
        },
        { signal },
      ),
    refetchInterval: 1000 * 60,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  return {
    ...query,
    data: query.data?.posts?.find(({ post }) => {
      switch (featuredContext) {
        case "local":
          return !post.featuredLocal;
        case "community":
          return !post.featuredCommunity;
      }
    }),
  };
}

export function usePosts(form: Forms.GetPosts) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();

  const postSort = useFiltersStore((s) => s.postSort);
  const sort = form.sort ?? postSort;

  const hideRead = useSettingsStore((s) => s.hideRead);

  form = {
    showRead: !hideRead,
    sort,
    /* pageCursor: pageParam === "init" ? undefined : pageParam, */
    /* sort, */
    /* communitySlug: form.community_name, */
    ...form,
  };

  const queryKey = usePostsKey(form);

  const cachePosts = usePostsStore((s) => s.cachePosts);
  // const patchPost = usePostsStore((s) => s.patchPost);

  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheFlairs = useFlairsStore((s) => s.cacheFlairs);

  const queryFn = async ({
    pageParam,
    signal,
  }: {
    pageParam: string;
    signal: AbortSignal;
  }) => {
    const { posts, nextCursor } = await (
      await api
    ).getPosts(
      {
        ...form,
        pageCursor: pageParam,
      },
      { signal },
    );

    cachePosts(
      getCachePrefixer(),
      posts.map((p) => p.post),
    );

    cacheCommunities(
      getCachePrefixer(),
      posts
        .map((p) => p.community)
        .filter(isNotNil)
        .map((communityView) => ({ communityView })),
    );

    cacheProfiles(
      getCachePrefixer(),
      posts.map((p) => p.creator).filter(isNotNil),
    );

    cacheFlairs(
      getCachePrefixer(),
      posts.flatMap((p) => p.flairs).filter(isNotNil),
    );

    return {
      posts: posts.map((p) => p.post.apId),
      imagePosts: posts
        .filter((p) => getPostEmbed(p.post).type === "image")
        .map((p) => p.post.apId),
      nextCursor,
    };
  };

  const query = useThrottledInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: INIT_PAGE_TOKEN,
    enabled: form.type === "Subscribed" ? isLoggedIn : true,
    reduceAutomaticRefetch: true,
  });

  const queryClient = useQueryClient();
  const prefetch = () =>
    queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn,
      initialPageParam: "init",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      pages: 1,
    });

  return {
    ...query,
    prefetch,
  };
}

function useListCommunitiesKey() {
  const { queryKeyPrefix } = useApiClients();
  return [...queryKeyPrefix, "listCommunities"];
}

export function useListCommunities(form: Forms.GetCommunities) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const queryKey = useListCommunitiesKey();

  if (form.sort) {
    queryKey.push("sort", form.sort);
  }

  if (form.type) {
    queryKey.push("type", form.type);
  }

  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);

  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { communities, nextCursor } = await (
        await api
      ).getCommunities(
        {
          ...form,
          //show_nsfw: showNsfw,
          pageCursor: pageParam,
        },
        {
          signal,
        },
      );
      cacheCommunities(
        getCachePrefixer(),
        communities.map((communityView) => ({ communityView })),
      );
      return {
        communities,
        nextPage: nextCursor,
      };
    },
    getNextPageParam: (data) => data.nextPage,
    initialPageParam: INIT_PAGE_TOKEN,
    enabled: form.type === "Subscribed" ? isLoggedIn : true,
  });
}
export function useCommunity({
  enabled = true,
  ...form
}: {
  enabled?: boolean;
  name?: string;
  instance?: string;
}) {
  const { api, queryKeyPrefix } = useApiClients();

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheFlairs = useFlairsStore((s) => s.cacheFlairs);

  const queryKey = [
    ...queryKeyPrefix,
    "getCommunity",
    `getCommunity-${form.name}`,
  ];

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const res = await (
        await api
      ).getCommunity(
        {
          slug: form.name,
        },
        {
          signal,
        },
      );
      cacheCommunities(getCachePrefixer(), [
        {
          communityView: res.community,
          mods: res.mods,
          flairs: res.flairs,
        },
      ]);
      cacheProfiles(getCachePrefixer(), res.mods);
      if (res.flairs) {
        cacheFlairs(getCachePrefixer(), res.flairs);
      }
      return res;
    },
    enabled: !!form.name && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

function is2faError(err?: Error | null) {
  return err && err.message.includes("missing_totp_token");
}

export function useSite({ instance }: { instance: string }) {
  return useQuery({
    queryKey: ["getSite", instance],
    queryFn: async ({ signal }) => {
      const api = await apiClient({ instance });
      return await api.getSite({ signal });
    },
  });
}

export function useRegister(config: {
  addAccount?: boolean;
  instance?: string;
}) {
  const { api } = useApiClients({ instance: config?.instance });

  const updateSelectedAccount = useAuth((s) => s.updateSelectedAccount);
  const addAccount = useAuth((s) => s.addAccount);

  const mutation = useMutation({
    mutationFn: async (form: Forms.Register) => {
      const res = await (await api).register(form);
      if (res.jwt && config.instance) {
        const payload = {
          jwt: res.jwt,
        };
        if (config?.addAccount) {
          addAccount({
            ...payload,
            instance: config.instance,
          });
        } else {
          updateSelectedAccount({
            ...payload,
            instance: config.instance,
          });
        }
      }
      return res;
    },
    onSuccess: ({ jwt, registrationCreated, verifyEmailSent }) => {
      if (!jwt) {
        toast.success(
          [
            verifyEmailSent && "Check your email to confirm registration.",
            registrationCreated &&
              "Your account will be approved soon then you can login.",
          ]
            .filter(Boolean)
            .join(" "),
          {
            duration: 20 * 1000,
          },
        );
      }
    },
    onError: (err) => {
      if (err !== Errors.MFA_REQUIRED) {
        toast.error(extractErrorContent(err));
        console.error(extractErrorContent(err));
      }
    },
  });

  return {
    ...mutation,
    needs2FA: is2faError(mutation.error),
  };
}

export function useLogin(config: { addAccount?: boolean; instance?: string }) {
  const { api } = useApiClients(config);

  const updateSelectedAccount = useAuth((s) => s.updateSelectedAccount);
  const addAccount = useAuth((s) => s.addAccount);

  const mutation = useMutation({
    mutationFn: async (form: Forms.Login) => {
      const res = await (await api).login(form);
      if (res.jwt && config.instance) {
        const payload = {
          jwt: res.jwt,
        };
        if (config?.addAccount) {
          addAccount({
            ...payload,
            instance: config.instance,
          });
        } else {
          updateSelectedAccount({
            ...payload,
            instance: config?.instance,
          });
        }
      }
      return res;
    },
    onMutate: () => {},
    onError: (err) => {
      if (err !== Errors.MFA_REQUIRED) {
        toast.error(extractErrorContent(err));
        console.error(err);
      }
    },
  });

  return {
    ...mutation,
    needsMfa: mutation.error === Errors.MFA_REQUIRED,
  };
}

function useRefreshAuthKey() {
  const { apis } = useApiClients();
  return ["refreshAuth", ...apis.map((api) => api.queryKeyPrefix.join("_"))];
}

export function useRefreshAuth() {
  const { apis } = useApiClients();

  const updateAccount = useAuth((s) => s.updateAccount);
  const logoutMultiple = useAuth((s) => s.logoutMultiple);

  const accounts = useAuth((s) => s.accounts);

  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);

  const queryKey = useRefreshAuthKey();

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const logoutIndicies: number[] = [];

      const sites = await Promise.allSettled(
        apis
          .map(async ({ api }) => (await api).getSite({ signal }))
          .map((p) => pTimeout(p, { milliseconds: 10 * 1000 })),
      );

      for (let i = 0; i < sites.length; i++) {
        const api = apis[i];
        const account = accounts[i];
        const p = sites[i];

        if (p?.status === "fulfilled") {
          const site = p.value;

          if (api?.isLoggedIn && site && !site.me) {
            logoutIndicies.push(i);
            continue;
          }

          const me = site.me;
          if (me) {
            cacheProfiles(getCachePrefixer(account), [me]);
            cacheCommunities(
              getCachePrefixer(account),
              [
                ...(site?.follows ?? []),
                ...(site?.moderates ?? []),
                ...(site?.communityBlocks ?? []),
              ].map((community) => ({
                communityView: community,
              })),
            );
          }

          if (site) {
            cacheProfiles(getCachePrefixer(account), [
              ...site.admins,
              ...(site.personBlocks ?? []),
            ]);
            updateAccount(i, {
              site,
            });
          }
        } else if (
          _.isString(p?.reason) &&
          p.reason.toLowerCase().indexOf("aborterror") === -1
        ) {
          logoutIndicies.push(i);
        }
      }

      if (logoutIndicies.length > 0) {
        logoutMultiple(logoutIndicies);
      }

      return {};
    },
    //onError: (err: any) => {
    //  console.log("Err", err);
    //},
    refetchOnWindowFocus: "always",
    refetchOnMount: "always",
  });
}

export function useLogout() {
  const listingType = useFiltersStore((s) => s.listingType);
  const setListingType = useFiltersStore((s) => s.setListingType);
  const communitiesListingType = useFiltersStore(
    (s) => s.communitiesListingType,
  );
  const setCommunitiesListingType = useFiltersStore(
    (s) => s.setCommunitiesListingType,
  );

  const mut = useMutation({
    mutationFn: async (account: Account) => {
      const api = await apiClient(account);
      await api.logout();
    },
    onSuccess: (_res, account) => {
      logout(account);
      resetFilters();
    },
  });

  const logout = useAuth((s) => s.logout);

  const resetFilters = () => {
    if (listingType === "Subscribed") {
      setListingType("All");
    }
    if (communitiesListingType === "Subscribed") {
      setCommunitiesListingType("All");
    }
  };

  return mut;
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const queryKey = useRefreshAuthKey();

  return useMutation({
    mutationFn: async ({
      account,
      form,
    }: {
      account: Account;
      form: Forms.SaveUserSettings;
    }) => {
      if (form.avatar) {
        form.avatar = await compressImage(form.avatar);
      }
      if (form.banner) {
        form.banner = await compressImage(form.banner);
      }
      const api = await apiClient(account);
      await api.saveUserSettings(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
    },
    onError: (err) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error("An unexpected error occured");
      }
      console.error(err);
    },
  });
}

export function useRemoveUserAvatar() {
  const queryClient = useQueryClient();
  const queryKey = useRefreshAuthKey();

  return useMutation({
    mutationFn: async (account: Account) => {
      const api = await apiClient(account);
      await api.removeUserAvatar();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
    },
    onError: (err) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error("An unexpected error occured");
      }
      console.error(err);
    },
  });
}

export function useLikePost(apId?: string) {
  const { api } = useApiClients();

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const patchPost = usePostsStore((s) => s.patchPost);

  return useMutation({
    mutationKey: ["likePost", apId],
    mutationFn: async ({
      postId,
      score,
    }: {
      postApId: string;
      postId: number;
      score: -1 | 0 | 1;
    }) => {
      return (await api).likePost({
        postId,
        score,
      });
    },
    onMutate: ({ postApId, score }) => {
      patchPost(postApId, getCachePrefixer(), {
        optimisticMyVote: score,
      });
    },
    onSuccess: (data) => {
      patchPost(data.apId, getCachePrefixer(), {
        optimisticMyVote: undefined,
        ...data,
      });
    },
    onError: (err, { postApId, score }) => {
      patchPost(postApId, getCachePrefixer(), {
        optimisticMyVote: undefined,
      });
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        let verb = "";
        switch (score) {
          case 0:
            verb = "upvote";
          case 1:
            verb = "unvote";
          case -1:
            verb = "downvote";
        }
        toast.error(`Couldn't ${verb} post`);
      }
    },
  });
}

interface CustumCreateCommentLike extends Forms.LikeComment {
  path: string;
}

export function useLikeComment() {
  const { api } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const patchComment = useCommentsStore((s) => s.patchComment);
  const cacheComments = useCommentsStore((s) => s.cacheComments);

  return useMutation({
    mutationFn: async (form: CustumCreateCommentLike) =>
      await (await api).likeComment(_.omit(form, ["path"])),
    onMutate: ({ score, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticMyVote: score,
      }));
    },
    onSuccess: (data) => {
      cacheComments(getCachePrefixer(), [
        {
          ...data,
          optimisticMyVote: undefined,
        },
      ]);
    },
    onError: (err, { path, score }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticMyVote: undefined,
      }));
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        let verb = "";
        switch (score) {
          case 0:
            verb = "upvote";
          case 1:
            verb = "unvote";
          case -1:
            verb = "downvote";
        }
        toast.error(`Couldn't ${verb} post`);
      }
    },
  });
}

export function useSaveComment(path?: string) {
  const queryClient = useQueryClient();
  const { api } = useApiClients();
  const patchComment = useCommentsStore((s) => s.patchComment);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const commentsQueryKey = useCommentsKey()({
    savedOnly: true,
    maxDepth: undefined,
    sort: "New",
  });

  return useMutation({
    mutationFn: async (form: Forms.SaveComment) =>
      (await api).saveComment(form),
    onMutate: ({ save }) => {
      if (path) {
        patchComment(path, getCachePrefixer(), () => ({
          optimisticSaved: save,
        }));
      }
    },
    onSuccess: (post) => {
      if (path) {
        patchComment(path, getCachePrefixer(), () => ({
          ...post,
          optimisticSaved: undefined,
        }));
      }
      queryClient.invalidateQueries({
        queryKey: commentsQueryKey,
      });
    },
    onError: (err, { save }) => {
      if (path) {
        patchComment(path, getCachePrefixer(), () => ({
          optimisticSaved: undefined,
        }));
      }
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${save ? "save" : "unsave"} comment`);
      }
    },
  });
}

interface CreateComment extends Forms.CreateComment {
  parentPath?: string;
  queryKeyParentId?: number;
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { api } = useApiClients();
  const myProfile = useAuth((s) => getAccountSite(s.getSelectedAccount())?.me);
  const commentSort = useFiltersStore((s) => s.commentSort);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  const markCommentForRemoval = useCommentsStore(
    (s) => s.markCommentForRemoval,
  );

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const getCommentsKey = useCommentsKey();

  return useMutation({
    mutationFn: async ({
      parentPath,
      queryKeyParentId,
      ...form
    }: CreateComment) => {
      const newComment = await (await api).createComment(form);
      return {
        newComment,
        sorts: (await api).getCommentSorts(),
      };
    },
    onMutate: ({ postApId, parentPath, body, queryKeyParentId }) => {
      confetti(body);
      const date = new Date();
      const isoDate = date.toISOString();
      const commentId = _.random(1, 1000000) * -1;
      const newComment: Schemas.Comment = {
        apId: "",
        id: commentId,
        createdAt: isoDate,
        path: `${parentPath ?? 0}.${commentId}`,
        upvotes: 1,
        downvotes: 0,
        deleted: false,
        removed: false,
        body,
        creatorId: myProfile?.id ?? -1,
        creatorApId: myProfile?.apId ?? "",
        creatorSlug: myProfile ? (myProfile.slug ?? "") : "",
        postId: -1,
        postApId,
        communitySlug: "",
        communityApId: "",
        postTitle: "",
        myVote: 1,
        childCount: 0,
        saved: false,
      };

      cacheComments(getCachePrefixer(), [newComment]);

      const form: Forms.GetComments = {
        postApId,
        parentId: queryKeyParentId,
        sort: commentSort,
      };

      let comments = queryClient.getQueryData<
        InfiniteData<
          {
            comments: {
              path: string;
              postId: number;
              creatorId: number;
              createdAt: string;
            }[];
            nextPage: number | null;
          },
          unknown
        >
      >(getCommentsKey(form));

      if (!comments) {
        return;
      }

      comments = _.cloneDeep(comments);

      const firstPage = comments.pages[0];
      if (firstPage) {
        firstPage.comments.unshift({
          path: newComment.path,
          creatorId: newComment.creatorId,
          postId: newComment.postId,
          createdAt: newComment.createdAt,
        });
      }

      queryClient.setQueryData(getCommentsKey(form), comments);

      return newComment;
    },
    onSuccess: ({ newComment, sorts }, { postApId, queryKeyParentId }, ctx) => {
      const settledComment = {
        path: newComment.path,
        creatorId: newComment.creatorId,
        postId: newComment.postId,
        createdAt: newComment.createdAt,
      };

      markCommentForRemoval(ctx.path, getCachePrefixer());
      cacheComments(getCachePrefixer(), [newComment]);

      sort: for (const sort of sorts) {
        const form: Forms.GetComments = {
          postApId,
          parentId: queryKeyParentId,
          sort,
        };

        let comments = queryClient.getQueryData<
          InfiniteData<
            {
              comments: {
                path: string;
                postId: number;
                creatorId: number;
                createdAt: string;
              }[];
              nextPage: number | null;
            },
            unknown
          >
        >(getCommentsKey(form));

        if (!comments) {
          // TODO: I think we have to trigger an API fetch here
          continue;
        }

        comments = _.cloneDeep(comments);

        // Technically we can skip this if we are removing
        // the comment from the cache
        for (const p of comments.pages) {
          const index = p.comments.findIndex((c) => c.path === ctx.path);
          if (index >= 0) {
            p.comments[index] = settledComment;
            queryClient.setQueryData(getCommentsKey(form), comments);
            continue sort;
          }
        }

        // If we're here then we didn't find the optimistic comment
        const firstPage = comments.pages[0];
        if (!firstPage) {
          // TODO: I think we have to trigger an API fetch here
          continue;
        }
        if (firstPage) {
          firstPage.comments.unshift(settledComment);
        }
        queryClient.setQueryData(getCommentsKey(form), comments);
      }
    },
  });
}

export function useEditComment() {
  const { api } = useApiClients();
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  const patchComment = useCommentsStore((s) => s.patchComment);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: { id: number; body: string; path: string }) =>
      await (await api).editComment(_.omit(form, "path")),
    onMutate: ({ path, body }) => {
      patchComment(path, getCachePrefixer(), (prev) => ({
        ...prev,
        body,
      }));
    },
    onSuccess: (commentView) => {
      cacheComments(getCachePrefixer(), [commentView]);
    },
  });
}

export function useDeleteComment() {
  const { api } = useApiClients();
  const patchComment = useCommentsStore((s) => s.patchComment);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: { id: number; path: string; deleted: boolean }) =>
      await (await api).deleteComment(_.omit(form, "path")),
    onMutate: ({ path, deleted }) => {
      patchComment(path, getCachePrefixer(), (prev) => ({
        ...prev,
        comment: {
          ...prev,
          deleted,
        },
      }));
    },
    onSuccess: (commentView) => {
      cacheComments(getCachePrefixer(), [commentView]);
    },
  });
}

function usePrivateMessagesKey() {
  const { queryKeyPrefix } = useApiClients();
  return [...queryKeyPrefix, "getPrivateMessages"];
}

export function usePrivateMessages(form: {}) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();
  const queryKey = usePrivateMessagesKey();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { privateMessages, profiles, nextCursor } = await (
        await api
      ).getPrivateMessages(
        {
          ...form,
          pageCursor: pageParam,
        },
        {
          signal,
        },
      );
      cacheProfiles(getCachePrefixer(), profiles);
      return {
        privateMessages,
        nextCursor,
      };
    },
    initialPageParam: INIT_PAGE_TOKEN,
    getNextPageParam: (prev) => prev.nextCursor,
    enabled: isLoggedIn,
    refetchOnWindowFocus: "always",
    refetchIntervalInBackground: true,
    refetchInterval: 1000 * 60,
    refetchOnMount: "always",
  });
}

export function useCreatePrivateMessage(
  recipient: Pick<Schemas.Person, "apId" | "id" | "slug">,
) {
  const account = useAuth((s) => s.getSelectedAccount());
  const { person: me } = parseAccountInfo(account);
  const { api } = useApiClients();
  const privateMessagesKey = usePrivateMessagesKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: Forms.CreatePrivateMessage) =>
      await (await api).createPrivateMessage(form),
    onMutate: (ctx) => {
      if (me && recipient.id === ctx.recipientId) {
        const pm: Schemas.PrivateMessage = {
          creatorId: me.id,
          creatorSlug: me.slug,
          creatorApId: me.apId,
          recipientSlug: recipient.slug,
          recipientApId: recipient.apId,
          recipientId: recipient.id,
          id: -1 * _.random(),
          read: false,
          createdAt: lemmyTimestamp(),
          body: ctx.body,
        };
        queryClient.setQueryData<
          InfiniteData<
            { privateMessages: Schemas.PrivateMessage[]; nextCursor: string },
            number
          >
        >(privateMessagesKey, (data) => {
          if (isInfiniteQueryData(data)) {
            const pages = [...data.pages];
            if (_.isArray(pages[0]?.privateMessages)) {
              pages[0] = _.cloneDeep(pages[0]);
              pages[0].privateMessages.unshift(pm);
            }
            return {
              ...data,
              pages,
            };
          }
          return data;
        });
      }
    },
  });
}

function usePrivateMessageCountQueryKey() {
  const { apis } = useApiClients();
  const queryKey = [
    "privateMessageCount",
    ...apis.map((api) => api.queryKeyPrefix.join("_")),
  ];
  return queryKey;
}

export function usePrivateMessagesCount() {
  const { apis } = useApiClients();
  const isLoggedIn = useAuth((a) => a.isLoggedIn());

  const queryKey = usePrivateMessageCountQueryKey();

  const { data } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const counts = await Promise.allSettled(
        apis.map(async ({ api, isLoggedIn }) => {
          if (!isLoggedIn) {
            return 0;
          }

          const { privateMessages } = await (
            await api
          ).getPrivateMessages(
            {
              unreadOnly: true,
            },
            { signal },
          );

          return privateMessages.length;
        }),
      );

      return counts.map((count) =>
        count.status === "fulfilled" ? count.value : 0,
      );
    },
    enabled: isLoggedIn,
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 60,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
  });

  return data ?? EMPTY_ARR;
}

export function useMarkPriavteMessageRead() {
  const { api } = useApiClients();
  const queryClient = useQueryClient();
  const accountIndex = useAuth((s) => s.accountIndex);

  const privateMessagesKey = usePrivateMessagesKey();
  const privateMessageCountQueryKey = usePrivateMessageCountQueryKey();

  return useMutation({
    mutationFn: async (form: Forms.MarkPrivateMessageRead) =>
      await (await api).markPrivateMessageRead(form),
    onMutate: (form) => {
      queryClient.setQueryData<number[]>(
        privateMessageCountQueryKey,
        (data) => {
          if (_.isNumber(data?.[accountIndex])) {
            const clone = [...data];
            const prev = clone[accountIndex];
            if (_.isNumber(prev)) {
              clone[accountIndex] = Math.max(prev + (form.read ? -1 : 1), 0);
            }
            return clone;
          }
          return data;
        },
      );
      queryClient.setQueryData<
        InfiniteData<
          { privateMessages: Schemas.PrivateMessage[]; nextCursor: string },
          number
        >
      >(privateMessagesKey, (data) => {
        if (isInfiniteQueryData(data)) {
          return produce(data, (draftState) => {
            for (const page of draftState.pages) {
              const messageIndex = page.privateMessages.findIndex(
                (pm) => pm.id === form.id,
              );
              if (messageIndex >= 0 && page.privateMessages[messageIndex]) {
                page.privateMessages[messageIndex].read = form.read;
              }
            }
          });
        }
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: privateMessageCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: privateMessagesKey,
      });
    },
    onError: (err, { read }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't mark message ${read ? "read" : "unread"}`);
      }
    },
  });
}

export function useReplies(form: Forms.GetReplies) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api, queryKeyPrefix } = useApiClients();
  const queryKey = [...queryKeyPrefix, "getReplies", form];
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { replies, profiles, nextCursor } = await (
        await api
      ).getReplies(
        {
          ...form,
          pageCursor: pageParam,
        },
        {
          signal,
        },
      );
      cacheProfiles(getCachePrefixer(), profiles);
      return {
        replies,
        nextCursor,
      };
    },
    initialPageParam: INIT_PAGE_TOKEN,
    getNextPageParam: (prev) => prev.nextCursor,
    enabled: isLoggedIn,
    refetchOnWindowFocus: "always",
  });
}

export function usePersonMentions(form: Forms.GetMentions) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api, queryKeyPrefix } = useApiClients();
  const queryKey = [...queryKeyPrefix, "getPersonMentions", form];
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { mentions, profiles, nextCursor } = await (
        await api
      ).getMentions(
        {
          ...form,
          pageCursor: pageParam,
        },
        {
          signal,
        },
      );
      cacheProfiles(getCachePrefixer(), profiles);
      return {
        mentions,
        nextCursor,
      };
    },
    initialPageParam: INIT_PAGE_TOKEN,
    getNextPageParam: (prev) => prev.nextCursor,
    enabled: isLoggedIn,
    refetchOnWindowFocus: "always",
  });
}

function useNotificationCountQueryKey() {
  const { apis } = useApiClients();
  const queryKey = [
    "notificationCount",
    ...apis.map((api) => api.queryKeyPrefix.join("_")),
  ];
  return queryKey;
}

export function useNotificationCount() {
  const { apis } = useApiClients();
  const isLoggedIn = useAuth((a) => a.isLoggedIn());

  const queryKey = useNotificationCountQueryKey();

  const { data } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const counts = await Promise.allSettled(
        apis.map(async ({ api, isLoggedIn }) => {
          if (!isLoggedIn) {
            return 0;
          }

          const a = await api;

          const [mentions, replies] = await Promise.allSettled([
            a.getMentions(
              {
                unreadOnly: true,
              },
              { signal },
            ),
            a.getReplies(
              {
                unreadOnly: true,
              },
              { signal },
            ),
          ]);
          const mentionCount =
            mentions.status === "fulfilled"
              ? mentions.value.mentions.length
              : 0;
          const repliesCount =
            replies.status === "fulfilled" ? replies.value.replies.length : 0;
          return mentionCount + repliesCount;
        }),
      );

      return counts.map((count) =>
        count.status === "fulfilled" ? count.value : 0,
      );
    },
    enabled: isLoggedIn,
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 60,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
  });

  return data ?? EMPTY_ARR;
}
const EMPTY_ARR: never[] = [];

export function useSearch(form: Forms.Search) {
  const { api, queryKeyPrefix } = useApiClients();

  const postSort = useFiltersStore((s) => s.postSort);
  form = {
    sort: postSort,
    ...form,
    q: form.q.trim(),
  };

  const queryKey = [...queryKeyPrefix, "search", form];

  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { posts, communities, comments, users, nextCursor } = await (
        await api
      ).search(
        {
          ...form,
          pageCursor: pageParam,
        },
        { signal },
      );

      cacheCommunities(
        getCachePrefixer(),
        communities.map((communityView) => ({ communityView })),
      );
      cacheProfiles(getCachePrefixer(), users);
      cachePosts(getCachePrefixer(), posts);

      return {
        communities: communities.map((c) => c.slug),
        posts: posts.map((p) => p.apId),
        comments,
        users: users.map((u) => u.apId),
        next_page: nextCursor,
      };
    },
    getNextPageParam: (lastPage) => lastPage.next_page,
    initialPageParam: INIT_PAGE_TOKEN,
    notifyOnChangeProps: "all",
    staleTime: 1000 * 60 * 5,
    enabled: !!form.q,
    // refetchOnWindowFocus: false,
    // refetchOnMount: true,
    // staleTime: Infinity,
  });
}

export function useInstances() {
  return useQuery({
    queryKey: ["getInstances"],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        "https://crawler.blorpblorp.xyz/v1/instances.json",
        { signal },
      );
      const json = await res.json();

      try {
        const lemmy = z
          .array(
            z.object({
              url: z.string(),
              description: z.string().optional(),
              icon: z.string().optional(),
              software: z.enum(["lemmy", "piefed"]),
              registrationMode: z.string(),
            }),
          )
          .parse(json);

        return _.shuffle(
          _.uniqBy(
            lemmy.map((item) => ({
              host: new URL(item.url).host,
              url: normalizeInstance(item.url),
              software: item.software as typeof item.software | undefined,
              description: item.description,
              icon: item.icon,
            })),
            ({ url }) => url,
          ),
        );
      } catch {
        return undefined;
      }
    },
  });
}

export function useFollowCommunity() {
  const { api, queryKeyPrefix } = useApiClients();

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const patchCommunity = useCommunitiesStore((s) => s.patchCommunity);
  const cacheCommunity = useCommunitiesStore((s) => s.cacheCommunity);

  const refreshAuthKey = useRefreshAuthKey();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: {
      community: Schemas.Community;
      follow: boolean;
    }) => {
      return (await api).followCommunity({
        communityId: form.community.id,
        follow: form.follow,
      });
    },
    onMutate: (form) => {
      const slug = form.community.slug;
      if (slug) {
        patchCommunity(slug, getCachePrefixer(), {
          communityView: {
            optimisticSubscribed: "Pending",
          },
        });
      }
    },
    onSuccess: (data) => {
      cacheCommunity(getCachePrefixer(), {
        communityView: {
          ...data,
          optimisticSubscribed: undefined,
        },
      });
    },
    onError: (err, form) => {
      const slug = form.community.slug;
      if (slug) {
        patchCommunity(slug, getCachePrefixer(), {
          communityView: {
            optimisticSubscribed: undefined,
          },
        });
      }
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error("Couldn't follow community");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, "listCommunities"],
      });
      queryClient.invalidateQueries({
        queryKey: refreshAuthKey,
      });
    },
  });
}

export function useMarkReplyRead() {
  const { api, queryKeyPrefix } = useApiClients();
  const queryClient = useQueryClient();

  const notificationCountQueryKey = useNotificationCountQueryKey();

  return useMutation({
    mutationFn: async (form: Forms.MarkReplyRead) =>
      (await api).markReplyRead(form),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, "getReplies"],
      });
    },
    onError: (err, { read }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't mark post ${read ? "read" : "unread"}`);
      }
    },
  });
}

export function useMarkPersonMentionRead() {
  const { api, queryKeyPrefix } = useApiClients();
  const queryClient = useQueryClient();

  const notificationCountQueryKey = useNotificationCountQueryKey();

  return useMutation({
    mutationFn: async (form: Forms.MarkMentionRead) =>
      await (await api).markMentionRead(form),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, "getPersonMentions"],
      });
    },
    onError: (err, { read }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't mark mention ${read ? "read" : "unread"}`);
      }
    },
  });
}

export function useCreatePost() {
  const router = useIonRouter();
  const history = useHistory();
  const { api } = useApiClients();
  const queryClient = useQueryClient();
  const getPostsQueryKey = usePostsKey();
  return useMutation({
    mutationFn: async (draft: Draft) => {
      if (!draft.communitySlug) {
        throw new Error("could not find community to create post under");
      }

      const { community } = await (
        await api
      ).getCommunity(
        {
          slug: draft.communitySlug,
        },
        {},
      );

      if (!community) {
        throw new Error("could not find community to create post under");
      }

      return await (await api).createPost(draftToCreatePostData(draft));
    },
    onMutate: () => {
      return toast.loading("Creating post");
    },
    onSuccess: ({ apId, communitySlug }, _, toastId) => {
      toast.dismiss(toastId);
      if (communitySlug) {
        history.replace(
          `/home/c/${communitySlug}/posts/${encodeURIComponent(apId)}`,
        );
      }
      queryClient.invalidateQueries({
        queryKey: getPostsQueryKey,
      });
    },
    onError: (err, _, toastId) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err), { id: toastId });
      } else {
        toast.error("Couldn't create post", { id: toastId });
      }
    },
  });
}

export function useEditPost(apId: string) {
  const history = useHistory();
  const { api } = useApiClients();
  const patchPost = usePostsStore((s) => s.patchPost);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  return useMutation({
    mutationFn: async (draft: Draft) => {
      return await (await api).editPost(draftToEditPostData(draft));
    },
    onMutate: () => {
      return toast.loading("Updating post");
    },
    onSuccess: (postView, _, toastId) => {
      toast.dismiss(toastId);
      patchPost(apId, getCachePrefixer(), postView);
      const slug = postView.communitySlug;
      if (slug) {
        history.replace(`/home/c/${slug}/posts/${encodeURIComponent(apId)}`);
      }
    },
    onError: (err, _, toastId) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err), { id: toastId });
      } else {
        toast.error("Couldn't update post", { id: toastId });
      }
    },
  });
}

export function useCreatePostReport() {
  const { api } = useApiClients();
  return useMutation({
    mutationFn: async (form: Forms.CreatePostReport) =>
      (await api).createPostReport(form),
    onError: (err) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error("Couldn't create post report");
      }
    },
  });
}

export function useCreateCommentReport() {
  const { api } = useApiClients();
  return useMutation({
    mutationFn: async (form: Forms.CreateCommentReport) =>
      (await api).createCommentReport(form),
    onError: (err) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error("Couldn't create comment report");
      }
    },
  });
}

export function useBlockPerson(account?: Account) {
  const queryClient = useQueryClient();
  const { api } = useApiClients(account);
  const accountsQueryKey = useRefreshAuthKey();
  return useMutation({
    mutationFn: async (form: Forms.BlockPerson) =>
      (await api).blockPerson(form),
    onError: (err, { block }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${block ? "block" : "unblock"} person`);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: accountsQueryKey,
      }),
  });
}

export function useBlockCommunity(account?: Account) {
  const queryClient = useQueryClient();
  const { api } = useApiClients(account);
  const accountsQueryKey = useRefreshAuthKey();
  return useMutation({
    mutationFn: async (form: Forms.BlockCommunity) =>
      (await api).blockCommunity(form),
    onError: (err, { block }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${block ? "block" : "unblock"} community`);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: accountsQueryKey,
      }),
  });
}

export function useSavePost(apId: string) {
  const queryClient = useQueryClient();
  const { api } = useApiClients();
  const patchPost = usePostsStore((s) => s.patchPost);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const postsQueryKey = usePostsKey({
    savedOnly: true,
  });

  return useMutation({
    mutationFn: async (form: { postId: number; save: boolean }) =>
      (await api).savePost(form),
    onMutate: ({ save }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticSaved: save,
      });
    },
    onSuccess: (post) => {
      patchPost(apId, getCachePrefixer(), {
        ...post,
        optimisticSaved: undefined,
      });
      queryClient.invalidateQueries({
        queryKey: postsQueryKey,
      });
    },
    onError: (err, { save }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticSaved: undefined,
      });
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${save ? "save" : "unsave"} post`);
      }
    },
  });
}

export function useDeletePost(apId: string) {
  const { api } = useApiClients();
  const patchPost = usePostsStore((s) => s.patchPost);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: Forms.DeletePost) => (await api).deletePost(form),
    onMutate: ({ deleted }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticDeleted: deleted,
      });
    },
    onSuccess: (data) => {
      patchPost(apId, getCachePrefixer(), {
        ...data,
        optimisticDeleted: undefined,
      });
    },
    onError: (err, { deleted }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticDeleted: undefined,
      });
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${deleted ? "delete" : "restore"} post`);
      }
    },
  });
}

export function useMarkPostRead(apId: string) {
  const { api } = useApiClients();
  const patchPost = usePostsStore((s) => s.patchPost);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: Forms.MarkPostRead) => {
      return (await api).markPostRead(form);
    },
    onMutate: ({ read }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticRead: read,
      });
    },
    onSuccess: (_, { read }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticRead: undefined,
        read,
      });
    },
    onError: (err, { read }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticRead: undefined,
      });
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't mark post ${read ? "read" : "unread"}`);
      }
    },
  });
}

export function useFeaturePost(apId: string) {
  const { api } = useApiClients();
  const patchPost = usePostsStore((s) => s.patchPost);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: Forms.FeaturePost) =>
      (await api).featurePost(form),
    onMutate: ({ featured }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticFeaturedCommunity: featured,
      });
    },
    onSuccess: (post) => {
      patchPost(apId, getCachePrefixer(), {
        ...post,
        optimisticFeaturedCommunity: undefined,
      });
    },
    onError: (err, { featured }) => {
      patchPost(apId, getCachePrefixer(), {
        optimisticFeaturedCommunity: undefined,
      });
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${featured ? "pin" : "unpin"} post`);
      }
    },
  });
}

export function useUploadImage() {
  const { api } = useApiClients();
  return useMutation({
    mutationFn: async ({ image }: Forms.UploadImage) => {
      const compressedImg = await compressImage(image);
      const res = await (await api).uploadImage({ image: compressedImg });
      return res;
    },
    onMutate: () => toast.loading("Uploading image"),
    onError: (err, _, toastId) => {
      // TOOD: find a way to determin if the request
      // failed because the image was too large
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err), { id: toastId });
      } else {
        toast.error("Failed to upload image", { id: toastId });
      }
    },
    onSuccess: (_1, _2, toastId) => toast.dismiss(toastId),
  });
}

export function useCaptcha({
  instance,
  enabled,
}: {
  instance: string;
  enabled?: boolean;
}) {
  const { api } = useApiClients({ instance });
  return useQuery({
    queryKey: ["captcha"],
    queryFn: async ({ signal }) => (await api).getCaptcha({ signal }),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3 * 1000),
    enabled,
  });
}

export function useSubscribedCommunities() {
  const subscribedCommunities = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.follows,
  );
  return useMemo(
    () =>
      (subscribedCommunities ?? []).sort((a, b) =>
        a.slug.localeCompare(b.slug),
      ),
    [subscribedCommunities],
  );
}

export function useModeratingCommunities() {
  const moderatingCommunities = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.moderates,
  );
  return useMemo(
    () =>
      (moderatingCommunities ?? []).sort((a, b) =>
        a.slug.localeCompare(b.slug),
      ),
    [moderatingCommunities],
  );
}

export function useAvailableSorts() {
  const { api, queryKeyPrefix } = useApiClients();
  return useQuery({
    queryKey: [queryKeyPrefix, "availableSorts"],
    queryFn: async () => {
      return {
        commentSorts: (await api).getCommentSorts(),
        postSorts: (await api).getPostSorts(),
        communitySorts: (await api).getCommunitySorts(),
      };
    },
  });
}

export function useResolveObject(query: string) {
  const { api, queryKeyPrefix } = useApiClients();
  return useQuery({
    queryKey: [queryKeyPrefix, "resolveObject" + query],
    queryFn: async ({ signal }) =>
      await (await api).resolveObject({ q: query }, { signal }),
  });
}

export function useLinkMetadat() {
  const { api } = useApiClients();
  return useMutation({
    mutationFn: async (form: Forms.GetLinkMetadata) => {
      return await (await api).getLinkMetadata(form);
    },
  });
}
