import {
  useQuery,
  InfiniteData,
  useQueryClient,
  useMutation,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useFiltersStore } from "@/src/stores/filters";
import {
  Account,
  getAccountSite,
  parseAccountInfo,
  useAuth,
} from "../stores/auth";
// eslint-disable-next-line no-restricted-imports -- intentional: useRefreshAuthQuery iterates multiple accounts and must scope each cache write to a specific account explicitly
import { getCachePrefixer } from "../stores/auth";
import { useEffect, useMemo, useState } from "react";
import { useIsStale } from "../hooks/use-is-stale";
import _ from "lodash";
import { usePostFromStore, usePostsStore } from "../stores/posts";
import { useSettingsStore } from "../stores/settings";
import { z } from "zod";
import { useCommentsStore } from "../stores/comments";
import { useCommunitiesStore } from "../stores/communities";
import { extractErrorContent, lemmyTimestamp } from "../apis/utils";
import { useProfilesStore } from "@/src/stores/profiles";
import { toast } from "sonner";
import {
  Draft,
  draftToCreatePostData,
  draftToEditPostData,
} from "@/src/stores/create-post";
import {
  isInfiniteQueryData,
  useThrottledInfiniteQuery,
} from "../tanstack-query/throttled-infinite-query";
import { produce } from "immer";
import { Errors, Forms, INIT_PAGE_TOKEN, Schemas } from "../apis/api-blueprint";
import { apiClient } from "../apis/client";
import pTimeout from "p-timeout";
import { SetOptional } from "type-fest";
import { env } from "@/src/env";
import { ensureValue, isErrorLike, isNotNil } from "../lib/utils";
import { normalizeInstance } from "../normalize-instance";
import { compressImage } from "../lib/image";
import { useFlairsStore } from "@/src/stores/flairs";
import { confetti } from "@/src/lib/confetti";
import { useHistory } from "@/src/routing";
import { getPostEmbed } from "../apis/post-embed";
import { useMultiCommunityFeedStore } from "@/src/stores/multi-community-feeds";
import { useShouldShowNsfw } from "../hooks/nsfw";

type QueryOverwriteOptions = Pick<UseQueryOptions<any>, "retry" | "enabled">;

export function useApiClients(config?: { instance?: string; jwt?: string }) {
  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const accounts = useAuth((s) => s.accounts);

  return useMemo(() => {
    const apis = accounts.map((account) => {
      const { instance, jwt } = account;
      const api = apiClient({ instance, jwt });

      const queryKeyPrefix: unknown[] = [
        `instance-${instance}`,
        `auth-${account.jwt ? "t" : "f"}`,
        `uuid-${account.uuid}`,
      ];

      return {
        api,
        queryKeyPrefix,
        isLoggedIn: !!account.jwt,
        account,
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
      ...(getInstanceOverride() ??
        apis.find((api) => api.account.uuid === selectedAccountUuid) ??
        getDefaultInstance()),
    };
  }, [accounts, selectedAccountUuid, config?.instance, config?.jwt]);
}

export function useSoftware(account?: Account) {
  const [software, setSoftware] = useState<
    | {
        software: "lemmy" | "piefed";
        softwareVersion: string;
      }
    | {
        software: undefined;
        softwareVersion: undefined;
      }
  >({
    software: undefined,
    softwareVersion: undefined,
  });
  const { api } = useApiClients(account);

  useEffect(() => {
    let canceled = false;
    api.then(({ software, softwareVersion }) => {
      if (!canceled) {
        setSoftware({
          software,
          softwareVersion,
        });
      }
    });
    return () => {
      canceled = true;
    };
  }, [api]);

  return software;
}

export function usePersonDetailsQuery({
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

function usePersonFeedKey({
  apIdOrUsername,
  type,
  sort,
}: Partial<Forms.GetPersonContent>) {
  const { queryKeyPrefix } = useApiClients();
  const queryKey = [...queryKeyPrefix, "getPersonFeed", apIdOrUsername];
  if (type || sort) {
    queryKey.push({ type, sort });
  }
  return queryKey;
}

export function usePersonFeedQuery({
  apIdOrUsername,
  type,
  sort,
}: SetOptional<Forms.GetPersonContent, "apIdOrUsername">) {
  const { api } = useApiClients();

  const { postSort } = useAvailableSortsQuery();

  sort ??= postSort;

  const queryKey = usePersonFeedKey({
    apIdOrUsername,
    type,
    sort,
  });

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

export function usePostQuery({
  ap_id: apId,
  enabled,
}: {
  ap_id?: string;
  enabled?: boolean;
}) {
  const { api, queryKeyPrefix } = useApiClients();

  const queryKey = [...queryKeyPrefix, "getPost", apId];

  const initialData = usePostFromStore(apId);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
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

      const { post, profiles, community, flairs } = await (
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
      if (profiles) {
        cacheProfiles(getCachePrefixer(), profiles);
      }
      if (flairs) {
        cacheFlairs(getCachePrefixer(), flairs);
      }

      return {};
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

export function useCommentsQuery(
  form: Forms.GetComments,
  options?: {
    enabled?: boolean;
  },
) {
  const enabled = options?.enabled ?? true;

  const { commentSort } = useAvailableSortsQuery();
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
        comments: comments.map((c) => c.path),
        nextCursor,
      };
    },
    enabled: enabled && (!_.isNil(form.postApId) || !_.isNil(form.savedOnly)),
    getNextPageParam: (data) => data.nextCursor,
    initialPageParam: INIT_PAGE_TOKEN,
    refetchOnMount: "always",
  });
}

export function usePostsKey(config?: Forms.GetPosts) {
  const { queryKeyPrefix } = useApiClients();
  const { communitySlug, ...form } = config ?? {};

  const { postSort } = useAvailableSortsQuery();
  const sort = form?.sort ?? postSort;

  const queryKey = [...queryKeyPrefix, sort];
  if (communitySlug) {
    queryKey.push(communitySlug);
  }
  if (Object.keys(form).length > 0) {
    queryKey.push(form);
  }

  return queryKey;
}

/** How often to check for new posts in the feed. */
const NEW_POSTS_CHECK_INTERVAL_MS = 60_000;

export function useMostRecentPostQuery(
  featuredContext: "local" | "community" | "feed",
  form: Forms.GetPosts,
  // WARNING: do not destructure this at the call site — TanStack Query warns
  // against spreading query results. We read only .dataUpdatedAt and
  // .isFetching here, which is safe.
  postsQuery: { dataUpdatedAt: number; isFetching: boolean },
) {
  const { api, queryKeyPrefix } = useApiClients();

  const postsIsStale = useIsStale(postsQuery, NEW_POSTS_CHECK_INTERVAL_MS);

  const { postSort } = useAvailableSortsQuery();
  const sort = form.sort ?? postSort;

  const hideRead = useSettingsStore((s) => s.hideRead);
  const showNsfw = useShouldShowNsfw();

  form = {
    showRead: !hideRead,
    sort,
    showNsfw,
    ...form,
  } satisfies Forms.GetPosts;

  return useQuery({
    queryKey: [...queryKeyPrefix, "mostRecentPost", featuredContext, form],
    enabled: postsIsStale && !postsQuery.isFetching,
    queryFn: async ({ signal }) => {
      const { posts } = await (
        await api
      ).getPosts(
        {
          ...form,
          sort: form.sort,
          type: form.type,
          ignoreSticky: true,
          limit: 10,
        },
        { signal },
      );
      return (
        posts?.find(({ post }) => {
          switch (featuredContext) {
            case "local":
              return !post.featuredLocal;
            case "community":
              return !post.featuredCommunity;
            case "feed":
              // Feeds don't have pinned posts, so no filtering needed.
              return true;
          }
        })?.post.apId ?? null
      );
    },
    refetchInterval: NEW_POSTS_CHECK_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function usePostsQuery(form: Forms.GetPosts) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();

  const { postSort } = useAvailableSortsQuery();
  const sort = form.sort ?? postSort;

  const hideRead = useSettingsStore((s) => s.hideRead);
  const showNsfw = useShouldShowNsfw();

  form = {
    showRead: !hideRead,
    sort,
    showNsfw,
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

  return useThrottledInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: INIT_PAGE_TOKEN,
    enabled: form.type === "Subscribed" ? isLoggedIn : true,
    reduceAutomaticRefetch: true,
  });
}

export function useListCommunitiesQuery(
  form: Forms.GetCommunities,
  options?: QueryOverwriteOptions,
) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api, queryKeyPrefix } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const { communitySort } = useAvailableSortsQuery();
  const showNsfw = useShouldShowNsfw();

  form = {
    sort: form.sort ?? communitySort,
    showNsfw,
    ...form,
  };

  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);

  const enabled = options?.enabled ?? true;

  return useThrottledInfiniteQuery({
    queryKey: [...queryKeyPrefix, "listCommunities", form],
    queryFn: async ({ pageParam, signal }) => {
      const { communities, nextCursor } = await (
        await api
      ).getCommunities(
        {
          ...form,
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
        communities: communities.map((c) => c.slug),
        nextPage: nextCursor,
      };
    },
    getNextPageParam: (data) => data.nextPage,
    initialPageParam: INIT_PAGE_TOKEN,
    ...options,
    enabled:
      enabled &&
      (form.type === "Subscribed" || form.type === "ModeratorView"
        ? isLoggedIn
        : true),
  });
}

export function useListMultiCommunityFeedsQuery(
  form: Forms.GetMultiCommunityFeeds,
  options?: QueryOverwriteOptions,
) {
  const { api, queryKeyPrefix } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheFeeds = useMultiCommunityFeedStore((s) => s.cacheFeeds);
  const queryKey = [...queryKeyPrefix, "getMultiCommunityFeeds", form];
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const res = await (await api).getMultiCommunityFeeds(form, { signal });
      cacheFeeds(
        getCachePrefixer(),
        res.multiCommunityFeeds.map((feedView) => ({ feedView })),
      );
      return res.multiCommunityFeeds.map((f) => f.apId);
    },
    getNextPageParam: () => null,
    initialPageParam: INIT_PAGE_TOKEN,
    ...options,
  });
}

export function useMultiCommunityFeedQuery(
  form: Forms.GetMultiCommunityFeed,
  options?: QueryOverwriteOptions,
) {
  const { api, queryKeyPrefix } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheFeeds = useMultiCommunityFeedStore((s) => s.cacheFeeds);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const queryKey = [...queryKeyPrefix, "getMultiCommunityFeed", form.apId];
  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const res = await (await api).getMultiCommunityFeed(form, { signal });
      cacheFeeds(getCachePrefixer(), [{ feedView: res.feed }]);
      cacheCommunities(
        getCachePrefixer(),
        res.communities.map((communityView) => ({ communityView })),
      );
      if (res.owner) {
        cacheProfiles(getCachePrefixer(), [res.owner]);
      }
      return res.feed.apId;
    },
    enabled: !!form.apId,
    ...options,
  });
}

export function useCommunityQuery({
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
      return {};
    },
    enabled: !!form.name && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

function is2faError(err?: Error | null) {
  return err && err.message.includes("missing_totp_token");
}

export function useInstanceSoftwareQuery(
  { instance }: { instance?: string },
  options?: QueryOverwriteOptions,
) {
  return useQuery({
    queryKey: ["getInstanceSoftware", instance],
    queryFn: async () => {
      if (!instance) {
        throw new Error("this should never happen");
      }
      const api = await apiClient({ instance });
      return api.software;
    },
    ...options,
    enabled: _.isString(instance) && options?.enabled !== false,
  });
}

export function useSiteQuery(
  { instance }: { instance: string },
  options?: QueryOverwriteOptions,
) {
  return useQuery({
    queryKey: ["getSite", instance],
    queryFn: async ({ signal }) => {
      const api = await apiClient({ instance });
      return await api.getSite({ signal });
    },
    ...options,
  });
}

export function useRegisterMutation(config: {
  addAccount?: boolean;
  instance?: string;
}) {
  const { api } = useApiClients({ instance: config?.instance });

  const updateSelectedAccount = useAuth((s) => s.updateSelectedAccount);
  const addAccount = useAuth((s) => s.addAccount);

  const queryClient = useQueryClient();
  const refreshAuthKey = useRefreshAuthKey();

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
      queryClient.invalidateQueries({
        queryKey: refreshAuthKey,
      });
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

export function useLoginMutation(config: {
  addAccount?: boolean;
  instance?: string;
}) {
  const { api } = useApiClients(config);

  const updateSelectedAccount = useAuth((s) => s.updateSelectedAccount);
  const addAccount = useAuth((s) => s.addAccount);

  const queryClient = useQueryClient();
  const refreshAuthKey = useRefreshAuthKey();

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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: refreshAuthKey,
      });
    },
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

export function useRefreshAuthQuery() {
  const { apis } = useApiClients();

  const updateAccountSite = useAuth((s) => s.updateAccountSite);
  const logoutMultiple = useAuth((s) => s.logoutMultiple);

  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);

  const setNsfwPreviouslyEnabled = useSettingsStore(
    (s) => s.setNsfwPreviouslyEnabled,
  );

  const queryKey = useRefreshAuthKey();

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const logoutUuids: string[] = [];

      const sites = await Promise.allSettled(
        apis
          .map(async ({ api }) => (await api).getSite({ signal }))
          .map((p) => pTimeout(p, { milliseconds: 10 * 1000 })),
      );

      for (let i = 0; i < sites.length; i++) {
        const api = apis[i];
        if (!api) {
          continue;
        }

        const account = api.account;
        const p = sites[i];

        if (p?.status === "fulfilled") {
          const { site, communities, profiles } = p.value;

          if (api?.isLoggedIn && api.account.uuid && site && !site.me) {
            logoutUuids.push(api.account.uuid);
            continue;
          }

          if (profiles) {
            cacheProfiles(getCachePrefixer(account), profiles);
          }

          if (communities) {
            cacheCommunities(
              getCachePrefixer(account),
              communities.map((community) => ({
                communityView: community,
              })),
            );
          }

          if (site) {
            updateAccountSite(api.account.uuid, site);
            if (site.showNsfw) {
              setNsfwPreviouslyEnabled(true);
            }
          }
        } else if (
          _.isString(p?.reason) &&
          p.reason.toLowerCase().indexOf("aborterror") === -1 &&
          api?.account.uuid
        ) {
          logoutUuids.push(api.account.uuid);
        }
      }

      if (logoutUuids.length > 0) {
        logoutMultiple(logoutUuids);
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

export function useLogoutMutation() {
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
      logout(account.uuid);
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

export function useUpdateUserSettingsMutation() {
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

export function useRemoveUserAvatarMutation() {
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

interface CustumCreateCommentLike extends Forms.LikeComment {
  path: string;
}

export function useLikeCommentMutation() {
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
            break;
          case 1:
            verb = "unvote";
            break;
          case -1:
            verb = "downvote";
            break;
        }
        toast.error(`Couldn't ${verb} post`);
      }
    },
  });
}

export function useSaveCommentMutation(path?: string) {
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

export function useCreateCommentMutation() {
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

  const patchReactQuery = ({
    sorts,
    postApId,
    queryKeyParentId,
    patchFn,
  }: {
    sorts: string[] | Readonly<string[]>;
    postApId: string;
    queryKeyParentId?: number;
    patchFn: (comments?: string[]) => string[] | undefined;
  }) => {
    sort: for (const sort of sorts) {
      const form: Forms.GetComments = {
        postApId,
        parentId: queryKeyParentId,
        sort,
      };

      let comments = queryClient.getQueryData<
        InfiniteData<
          {
            comments: string[];
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
        const output = patchFn(p.comments);
        if (output) {
          p.comments = output;
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
      const newComment = patchFn();
      if (firstPage && newComment) {
        firstPage.comments.unshift(...newComment);
      }
      queryClient.setQueryData(getCommentsKey(form), comments);
    }
  };

  return useMutation({
    mutationFn: async ({
      parentPath: _1,
      queryKeyParentId: _2,
      ...form
    }: CreateComment) => {
      confetti(form.body);
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
        locked: false,
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
        isBannedFromCommunity: false,
        postId: -1,
        postApId,
        communitySlug: "",
        communityApId: "",
        postTitle: "",
        myVote: 1,
        childCount: 0,
        saved: false,
        answer: false,
        emojiReactions: [],
      };

      cacheComments(getCachePrefixer(), [newComment]);

      const newReactQueryItem = {
        path: newComment.path,
        creatorId: newComment.creatorId,
        postId: newComment.postId,
        createdAt: newComment.createdAt,
      };

      patchReactQuery({
        postApId,
        queryKeyParentId,
        sorts: [commentSort],
        patchFn: (comments) => {
          if (comments) {
            return [newReactQueryItem.path, ...comments];
          } else {
            return [newReactQueryItem.path];
          }
        },
      });

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

      patchReactQuery({
        postApId,
        queryKeyParentId,
        sorts,
        patchFn: (comments) => {
          if (comments) {
            const index = comments.findIndex((p) => p === ctx.path);
            if (index >= 0) {
              const clone = [...comments];
              clone[index] = settledComment.path;
              return clone;
            }
          } else {
            return [settledComment.path];
          }
        },
      });
    },
    onError: (_1, { postApId, queryKeyParentId }, ctx) => {
      toast.error("Couldn't create comment");
      if (ctx) {
        patchReactQuery({
          postApId,
          queryKeyParentId,
          sorts: [commentSort],
          patchFn: (comments) => {
            if (comments) {
              const index = comments.findIndex((p) => p === ctx.path);
              if (index >= 0) {
                return comments.filter((p) => p !== ctx.path);
              }
            }
          },
        });
      }
    },
  });
}

export function useEditCommentMutation() {
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
    onError: () => toast.error("Couldn't update comment"),
  });
}

export function useDeleteCommentMutation() {
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
    onError: (_err, { deleted }) =>
      toast.error(`Failed to ${deleted ? "delete" : "undelete"} comment`),
  });
}

function getPrivateMessagesKey(queryKeyPrefix: unknown[]) {
  return [...queryKeyPrefix, "getPrivateMessages"];
}

function usePrivateMessagesKey() {
  const { queryKeyPrefix } = useApiClients();
  return getPrivateMessagesKey(queryKeyPrefix);
}

export function usePrivateMessagesQuery(form: Forms.GetPrivateMessages) {
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

export function useCreatePrivateMessageMutation(
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

export function usePrivateMessagesCountQuery() {
  const { apis } = useApiClients();
  const isLoggedIn = useAuth((a) => a.isLoggedIn());
  const selectedAccountUuid = useAuth((a) => a.getSelectedAccount().uuid);

  const queryKey = usePrivateMessageCountQueryKey();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const counts = await Promise.allSettled(
        apis.map(async ({ api, isLoggedIn, queryKeyPrefix, account }) => {
          if (!isLoggedIn) {
            return [account.uuid, 0] as const;
          }

          const { privateMessages } = await (
            await api
          ).getPrivateMessages(
            {
              unreadOnly: true,
            },
            { signal },
          );

          if (
            account.uuid === selectedAccountUuid &&
            privateMessages.length > 0
          ) {
            queryClient.invalidateQueries({
              queryKey: getPrivateMessagesKey(queryKeyPrefix),
            });
          }

          return [account.uuid, privateMessages.length] as const;
        }),
      );

      const pairs = counts
        .filter((count) => count.status === "fulfilled")
        .map((count) => [...count.value]);

      return _.fromPairs(pairs);
    },
    enabled: isLoggedIn,
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 60,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
  });

  return data ?? {};
}

export function useMarkPrivateMessageReadMutation() {
  const { api } = useApiClients();
  const queryClient = useQueryClient();
  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);

  const privateMessagesKey = usePrivateMessagesKey();
  const privateMessageCountQueryKey = usePrivateMessageCountQueryKey();

  return useMutation({
    mutationFn: async (form: Forms.MarkPrivateMessageRead) =>
      await (await api).markPrivateMessageRead(form),
    onMutate: (form) => {
      queryClient.setQueryData<Record<string, number>>(
        privateMessageCountQueryKey,
        (data) => {
          if (_.isNumber(data?.[selectedAccountUuid])) {
            const clone = { ...data };
            const prev = clone[selectedAccountUuid];
            if (_.isNumber(prev)) {
              clone[selectedAccountUuid] = Math.max(
                prev + (form.read ? -1 : 1),
                0,
              );
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

function useRepliesQueryKey(form?: Forms.GetReplies) {
  const { queryKeyPrefix } = useApiClients();
  return _.compact([...queryKeyPrefix, "getReplies", form]);
}

export function useRepliesQuery(form: Forms.GetReplies) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();
  const queryKey = useRepliesQueryKey(form);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { replies, comments, profiles, nextCursor } = await (
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
      cacheComments(getCachePrefixer(), comments);
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

function usePersonMentionsKey(form: Forms.GetMentions) {
  const { queryKeyPrefix } = useApiClients();
  return [...queryKeyPrefix, "getPersonMentions", form];
}

export function usePersonMentionsQuery(form: Forms.GetMentions) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();
  const queryKey = usePersonMentionsKey(form);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { mentions, comments, profiles, nextCursor } = await (
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
      cacheComments(getCachePrefixer(), comments);
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

function usePostReportsKey() {
  const { queryKeyPrefix } = useApiClients();
  return [...queryKeyPrefix, "getPostReports"];
}

export function usePostReportsQuery() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const queryKey = usePostReportsKey();
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { posts, users, communities, postReports, nextCursor } = await (
        await api
      ).getPostReports(
        {
          pageCursor: pageParam,
        },
        {
          signal,
        },
      );
      cacheProfiles(getCachePrefixer(), users);
      cacheCommunities(
        getCachePrefixer(),
        communities.map((communityView) => ({ communityView })),
      );
      cachePosts(getCachePrefixer(), posts);
      return {
        postReports,
        nextCursor,
      };
    },
    initialPageParam: INIT_PAGE_TOKEN,
    getNextPageParam: (prev) => prev.nextCursor,
    enabled: isLoggedIn,
    refetchOnWindowFocus: "always",
  });
}

export function useResolvePostReportMutation() {
  const { api } = useApiClients();
  const queryClient = useQueryClient();
  const postReportsQueryKey = usePostReportsKey();
  const notificationCountQueryKey = useNotificationCountQueryKey();
  const me = useAuth((s) => getAccountSite(s.getSelectedAccount())?.me);

  return useMutation({
    mutationFn: async (form: Forms.ResolvePostReport) =>
      (await api).resolvePostReport(form),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: postReportsQueryKey,
      });
    },
    onMutate: (form) => {
      const reports =
        queryClient.getQueryData<
          InfiniteData<{ postReports: Schemas.PostReport[] }, unknown>
        >(postReportsQueryKey);
      if (reports) {
        const patched = produce(reports, (prev) => {
          for (const page of prev.pages) {
            for (const postReport of page.postReports) {
              if (postReport.id === form.reportId) {
                postReport.resolved = form.resolved;
                if (me) {
                  postReport.resolverId = me.id;
                  postReport.resolverApId = me.apId;
                  postReport.resolverSlug = me.slug;
                }
                break;
              }
            }
          }
        });
        queryClient.setQueryData(postReportsQueryKey, patched);
      }
    },
    onError: (err, { resolved }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(
          `Failed to mark post report ${resolved ? "resolved" : "unresolved"}`,
        );
      }
      console.error(err);
    },
  });
}

export function useResolveCommentReportMutation() {
  const { api } = useApiClients();
  const queryClient = useQueryClient();
  const commentReportsQueryKey = useCommentReportsKey();
  const notificationCountQueryKey = useNotificationCountQueryKey();
  const me = useAuth((s) => getAccountSite(s.getSelectedAccount())?.me);

  return useMutation({
    mutationFn: async (form: Forms.ResolvePostReport) =>
      (await api).resolveCommentReport(form),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: commentReportsQueryKey,
      });
    },
    onMutate: (form) => {
      const reports = queryClient.getQueryData<
        InfiniteData<{ commentReports: Schemas.CommentReport[] }, unknown>
      >(commentReportsQueryKey);
      if (reports) {
        const patched = produce(reports, (prev) => {
          for (const page of prev.pages) {
            for (const commentReport of page.commentReports) {
              if (commentReport.id === form.reportId) {
                commentReport.resolved = form.resolved;
                if (me) {
                  commentReport.resolverId = me.id;
                  commentReport.resolverApId = me.apId;
                  commentReport.resolverSlug = me.slug;
                }
                break;
              }
            }
          }
        });
        queryClient.setQueryData(commentReportsQueryKey, patched);
      }
    },
    onError: (err, { resolved }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(
          `Failed to mark comment report ${resolved ? "resolved" : "unresolved"}`,
        );
      }
      console.error(err);
    },
  });
}

function useCommentReportsKey() {
  const { queryKeyPrefix } = useApiClients();
  return [...queryKeyPrefix, "getCommentReports"];
}

export function useCommentReportsQuery() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const { api } = useApiClients();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
  const queryKey = useCommentReportsKey();
  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { comments, users, communities, commentReports, nextCursor } =
        await (
          await api
        ).getCommentReports(
          {
            pageCursor: pageParam,
          },
          {
            signal,
          },
        );
      cacheProfiles(getCachePrefixer(), users);
      cacheCommunities(
        getCachePrefixer(),
        communities.map((communityView) => ({ communityView })),
      );
      cacheComments(getCachePrefixer(), comments);
      return {
        commentReports,
        nextCursor,
      };
    },
    initialPageParam: INIT_PAGE_TOKEN,
    getNextPageParam: (prev) => prev.nextCursor,
    enabled: isLoggedIn,
    refetchOnWindowFocus: "always",
  });
}

export function useModlogQuery(form: Forms.GetModlog) {
  const { api } = useApiClients();
  const queryKey = ["modlog", form.communitySlug ?? "site"];

  return useThrottledInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const { items, nextCursor } = await (
        await api
      ).getModlog({ ...form, pageCursor: pageParam }, { signal });
      return { items, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: INIT_PAGE_TOKEN,
    gcTime: 30_000,
    staleTime: 30_000,
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

export function useNotificationCountQuery() {
  const { apis } = useApiClients();
  const isLoggedIn = useAuth((a) => a.isLoggedIn());

  const queryKey = useNotificationCountQueryKey();

  const { data } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const counts = await Promise.allSettled(
        apis.map(async ({ api, isLoggedIn, account }) => {
          if (!isLoggedIn) {
            return [account.uuid, 0] as const;
          }

          const a = await api;

          const [mentions, replies, postReports, commentReports] =
            await Promise.allSettled([
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
              a.getPostReports(
                {
                  unresolvedOnly: true,
                },
                { signal },
              ),
              a.getCommentReports(
                {
                  unresolvedOnly: true,
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
          const postReportsCount =
            postReports.status === "fulfilled"
              ? postReports.value.postReports.length
              : 0;
          const commentReportsCount =
            commentReports.status === "fulfilled"
              ? commentReports.value.commentReports.length
              : 0;

          return [
            account.uuid,
            mentionCount +
              repliesCount +
              postReportsCount +
              commentReportsCount,
          ] as const;
        }),
      );

      const pairs = counts
        .filter((count) => count.status === "fulfilled")
        .map((count) => [...count.value]);

      return _.fromPairs(pairs);
    },
    enabled: isLoggedIn,
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 60,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
  });

  return data ?? {};
}

export function useSearchQuery(form: Forms.Search) {
  const { api, queryKeyPrefix } = useApiClients();

  const { postSort } = useAvailableSortsQuery();
  form = {
    sort: postSort,
    ...form,
    q: form.q.trim(),
  };

  const queryKey = [...queryKeyPrefix, "search", form];

  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheCommunities = useCommunitiesStore((s) => s.cacheCommunities);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const cacheComments = useCommentsStore((s) => s.cacheComments);
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
      cacheComments(getCachePrefixer(), comments);

      return {
        communities: communities.map((c) => c.slug),
        posts: posts.map((p) => p.apId),
        comments: comments.map((c) => c.path),
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

export function useInstancesQuery() {
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

export function useFollowCommunityMutation() {
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

export function useFollowFeedMutation() {
  const { api, queryKeyPrefix } = useApiClients();

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const patchFeed = useMultiCommunityFeedStore((s) => s.patchFeed);

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: {
      feed: Schemas.MultiCommunityFeed;
      follow: boolean;
    }) => {
      return (await api).followFeed({
        feedId: form.feed.id,
        follow: form.follow,
      });
    },
    onMutate: (form) => {
      patchFeed(form.feed.apId, getCachePrefixer(), {
        optimisticSubscribed: form.follow ? "Pending" : "NotSubscribed",
      });
    },
    onSuccess: (data) => {
      patchFeed(data.apId, getCachePrefixer(), {
        ...data,
        optimisticSubscribed: undefined,
      });
    },
    onError: (_err, form) => {
      patchFeed(form.feed.apId, getCachePrefixer(), {
        optimisticSubscribed: undefined,
      });
      toast.error("Couldn't follow feed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, "getMultiCommunityFeeds"],
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, "getMultiCommunityFeed"],
      });
    },
  });
}

export function useMarkAllReadMutation() {
  const { api, queryKeyPrefix } = useApiClients();
  const queryClient = useQueryClient();

  const readMentionsKey = usePersonMentionsKey({ unreadOnly: false });
  const unreadMentionsKey = usePersonMentionsKey({ unreadOnly: true });
  const readRepliesKey = useRepliesQueryKey({ unreadOnly: false });
  const unreadRepliesKey = useRepliesQueryKey({ unreadOnly: true });
  const notificationCountQueryKey = useNotificationCountQueryKey();
  const repliesQueryKey = useRepliesQueryKey();

  return useMutation({
    mutationFn: async () => (await api).markAllRead(),
    onMutate: () => {
      for (const key of [readRepliesKey, unreadRepliesKey]) {
        const replies =
          queryClient.getQueryData<
            InfiniteData<{ replies: Schemas.Reply[] }, unknown>
          >(key);
        if (replies) {
          const update = produce(replies, (prev) => {
            for (const page of prev?.pages ?? []) {
              for (const reply of page.replies) {
                reply.read = true;
              }
            }
          });
          queryClient.setQueryData(key, update);
        }
      }
      for (const key of [readMentionsKey, unreadMentionsKey]) {
        const mentions =
          queryClient.getQueryData<
            InfiniteData<{ mentions: Schemas.Mention[] }, unknown>
          >(key);
        if (mentions) {
          const update = produce(mentions, (prev) => {
            for (const page of prev?.pages ?? []) {
              for (const mention of page.mentions) {
                mention.read = true;
              }
            }
          });
          queryClient.setQueryData(key, update);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: repliesQueryKey,
      });
    },
    onError: (err) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error("Couldn't mark all read");
      }
    },
  });
}

export function useMarkReplyReadMutation() {
  const { api } = useApiClients();
  const queryClient = useQueryClient();

  const readRepliesKey = useRepliesQueryKey({ unreadOnly: false });
  const unreadRepliesKey = useRepliesQueryKey({ unreadOnly: true });
  const notificationCountQueryKey = useNotificationCountQueryKey();
  const repliesQueryKey = useRepliesQueryKey();

  return useMutation({
    mutationFn: async (form: Forms.MarkReplyRead) =>
      (await api).markReplyRead(form),
    onMutate: ({ id, read }) => {
      for (const key of [readRepliesKey, unreadRepliesKey]) {
        const replies =
          queryClient.getQueryData<
            InfiniteData<{ replies: Schemas.Reply[] }, unknown>
          >(key);
        if (replies) {
          const update = produce(replies, (prev) => {
            for (const page of prev?.pages ?? []) {
              const reply = page.replies.find((reply) => reply.id === id);
              if (reply) {
                reply.read = read;
              }
            }
          });
          queryClient.setQueryData(key, update);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationCountQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: repliesQueryKey,
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

export function useMarkPersonMentionReadMutation() {
  const { api, queryKeyPrefix } = useApiClients();
  const queryClient = useQueryClient();

  const readMentionsKey = usePersonMentionsKey({ unreadOnly: false });
  const unreadMentionsKey = usePersonMentionsKey({ unreadOnly: true });
  const notificationCountQueryKey = useNotificationCountQueryKey();

  return useMutation({
    mutationFn: async (form: Forms.MarkMentionRead) =>
      await (await api).markMentionRead(form),
    onMutate: ({ read, id }) => {
      for (const key of [readMentionsKey, unreadMentionsKey]) {
        const mentions =
          queryClient.getQueryData<
            InfiniteData<{ mentions: Schemas.Mention[] }, unknown>
          >(key);
        if (mentions) {
          const update = produce(mentions, (prev) => {
            for (const page of prev?.pages ?? []) {
              const mention = page.mentions.find(
                (mention) => mention.id === id,
              );
              if (mention) {
                mention.read = read;
              }
            }
          });
          queryClient.setQueryData(key, update);
        }
      }
    },
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

export function useCreatePostMutation() {
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

export function useEditPostMutation(apId: string) {
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

export function useCreatePostReportMutation() {
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

export function useCreateCommentReportMutation() {
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

export function useBlockPersonMutation(options?: {
  account?: Account;
  apId?: string;
}) {
  const { account, apId } = options ?? {};
  const queryClient = useQueryClient();
  const { api } = useApiClients(account);
  const accountsQueryKey = useRefreshAuthKey();
  const personFeedQueryKey = usePersonFeedKey({
    apIdOrUsername: apId,
  });
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountsQueryKey,
      });
      if (personFeedQueryKey) {
        queryClient.invalidateQueries({
          queryKey: personFeedQueryKey,
        });
      }
    },
  });
}

export function useBlockInstanceMutation(options?: { account?: Account }) {
  const { account } = options ?? {};
  const queryClient = useQueryClient();
  const { api } = useApiClients(account);
  const accountsQueryKey = useRefreshAuthKey();
  return useMutation({
    mutationFn: async (form: Forms.BlockInstance) =>
      (await api).blockInstance(form),
    onError: (err, { block }) => {
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${block ? "block" : "unblock"} instance`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountsQueryKey,
      });
    },
  });
}

export function useBlockCommunityMutation(options?: {
  account?: Account;
  communitySlug?: string;
}) {
  const { account, communitySlug } = options ?? {};
  const postsQueryKey = usePostsKey({ communitySlug });
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountsQueryKey,
      });
      if (communitySlug) {
        queryClient.invalidateQueries({
          queryKey: postsQueryKey,
        });
      }
    },
  });
}

export function useRemoveCommentMutation() {
  const { api } = useApiClients();
  const patchComment = useCommentsStore((s) => s.patchComment);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: Forms.RemoveComment & { path: string }) =>
      (await api).removeComment(form),
    onMutate: ({ removed, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticRemoved: removed,
      }));
    },
    onSuccess: (commentView) =>
      patchComment(commentView.path, getCachePrefixer(), () => ({
        optimisticRemoved: undefined,
        ...commentView,
      })),
    onError: (err, { removed, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticRemoved: undefined,
      }));
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${removed ? "remove" : "restore"} comment`);
      }
    },
  });
}

export function useLockCommentMutation() {
  const { api } = useApiClients();
  const patchComment = useCommentsStore((s) => s.patchComment);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: Forms.LockComment & { path: string }) =>
      (await api).lockComment(form),
    onMutate: ({ locked, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticLocked: locked,
      }));
    },
    onSuccess: (commentView) =>
      patchComment(commentView.path, getCachePrefixer(), () => ({
        optimisticLocked: undefined,
        ...commentView,
      })),
    onError: (err, { locked, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticLocked: undefined,
      }));
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${locked ? "lock" : "unlock"} comment`);
      }
    },
  });
}

export function useMarkCommentAsAnswerMutation() {
  const { api } = useApiClients();
  const patchComment = useCommentsStore((s) => s.patchComment);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (form: Forms.MarkCommentAsAnswer & { path: string }) =>
      (await api).markCommentAsAnswer(_.omit(form, ["path"])),
    onMutate: ({ answer, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticAnswer: answer,
      }));
    },
    onSuccess: (commentView, { path }) =>
      patchComment(path, getCachePrefixer(), () => ({
        optimisticAnswer: undefined,
        answer: commentView.answer,
      })),
    onError: (err, { answer, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticAnswer: undefined,
      }));
      if (isErrorLike(err)) {
        toast.error(extractErrorContent(err));
      } else {
        toast.error(`Couldn't ${answer ? "mark" : "unmark"} comment as answer`);
      }
    },
  });
}

export function useAddCommentReactionEmojiMutation() {
  const { api } = useApiClients();
  const patchComment = useCommentsStore((s) => s.patchComment);
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  return useMutation({
    mutationFn: async (
      form: Forms.AddCommentReactionEmoji & { path: string },
    ) => (await api).addCommentReactionEmoji(_.omit(form, ["path"])),
    onMutate: ({ emoji, path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticMyEmojiReaction: emoji,
      }));
    },
    onSuccess: (commentView, { path }) =>
      patchComment(path, getCachePrefixer(), () => ({
        optimisticMyEmojiReaction: undefined,
        ...commentView,
      })),
    onError: (_err, { path }) => {
      patchComment(path, getCachePrefixer(), () => ({
        optimisticMyEmojiReaction: undefined,
      }));
      toast.error("Couldn't add emoji reaction");
    },
  });
}

export function useUploadImageMutation() {
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

export function useCaptchaQuery({
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
    () => (subscribedCommunities ?? []).sort((a, b) => a.localeCompare(b)),
    [subscribedCommunities],
  );
}

export function useModeratingCommunities() {
  const moderatingCommunities = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.moderates,
  );
  return useMemo(
    () => (moderatingCommunities ?? []).sort((a, b) => a.localeCompare(b)),
    [moderatingCommunities],
  );
}

export function useAvailableSortsQuery() {
  const { api, queryKeyPrefix } = useApiClients();
  const communitySort = useFiltersStore((s) => s.communitySort);
  const postSort = useFiltersStore((s) => s.postSort);
  const commentSort = useFiltersStore((s) => s.commentSort);
  const query = useQuery({
    queryKey: [queryKeyPrefix, "availableSorts"],
    queryFn: async () => {
      return {
        commentSorts: (await api).getCommentSorts(),
        postSorts: (await api).getPostSorts(),
        communitySorts: (await api).getCommunitySorts(),
      };
    },
  });
  const postSorts = query.data?.postSorts;
  const suggestedPostSort = postSorts?.includes("Active")
    ? "Active"
    : postSorts?.includes("Hot")
      ? "Hot"
      : undefined;

  return {
    commentSort: ensureValue(query.data?.commentSorts, commentSort),
    commentSorts: query.data?.commentSorts,
    postSort: ensureValue(query.data?.postSorts, postSort),
    postSorts,
    suggestedPostSort,
    communitySort: ensureValue(query.data?.communitySorts, communitySort),
    communitySorts: query.data?.communitySorts,
  };
}

export function useResolveObjectQuery(
  config: {
    q: string | undefined;
    instance?: string;
  },
  options?: QueryOverwriteOptions,
) {
  const { api, queryKeyPrefix } = useApiClients();
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: [queryKeyPrefix, "resolveObject", config],
    queryFn: async ({ signal }) => {
      if (!config.q) {
        throw new Error("This shouldn't happen");
      }
      if (config.instance) {
        return await (
          await apiClient({ instance: config.instance })
        ).resolveObject({ q: config.q }, { signal });
      }
      return await (await api).resolveObject({ q: config.q }, { signal });
    },
    enabled: enabled && !!config.q,
  });
}

export function useResolveObjectAcrossAccountsQuery(apId: string | undefined) {
  const { apis } = useApiClients();
  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const accounts = useAuth((s) => s.accounts);

  const queryKey = [
    "resolveObjectAcrossAccounts",
    apId,
    ...apis.map((a) => a.queryKeyPrefix.join("_")),
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!apId) {
        throw new Error("This shouldn't happen");
      }
      const results = await Promise.allSettled(
        apis.map(async (apiEntry) => {
          if (apiEntry.account.uuid === selectedAccountUuid) {
            throw new Error("Skip current account");
          }
          const resolved = await (
            await apiEntry.api
          ).resolveObject({ q: apId });
          return {
            account: apiEntry.account,
            result: resolved,
          };
        }),
      );
      return results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<{
            account: Account;
            result: Schemas.ResolveObject;
          }> => r.status === "fulfilled",
        )
        .map((r) => r.value);
    },
    enabled: !!apId && accounts.length > 1,
    retry: false,
  });
}

export function useLinkMetadataMutation() {
  const { api } = useApiClients();
  return useMutation({
    mutationFn: async (form: Forms.GetLinkMetadata) => {
      return await (await api).getLinkMetadata(form);
    },
  });
}
