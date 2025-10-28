import {
  useInfiniteQuery,
  InfiniteData,
  useQueryClient,
  UseInfiniteQueryOptions,
  DefaultError,
  QueryKey,
} from "@tanstack/react-query";
import _ from "lodash";
import { useThrottleQueue } from "../lib/throttle-queue";
import { create } from "zustand/react";

const useWarmedKeysStore = create<{
  warmedKeys: string[];
  addWarmedKey: (key: string) => void;
}>()((set) => ({
  warmedKeys: [],
  addWarmedKey: (key) => {
    set((prev) => ({
      warmedKeys: _.uniq([...prev.warmedKeys, key]),
    }));
  },
}));

export function isInfiniteQueryData(data: any): data is InfiniteData<any, any> {
  return (
    data &&
    typeof data === "object" &&
    Array.isArray(data.pages) &&
    Array.isArray(data.pageParams)
  );
}

export function useThrottledInfiniteQuery<
  TQueryFnData,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>({
  reduceAutomaticRefetch,
  ...options
}: UseInfiniteQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey,
  TPageParam
> & {
  /**
   * It's very jarring to have a feed of e.g. posts
   * start refreshing itself automatically, then the
   * post you were looking at suddenly dissapears.
   * This options says, once you've fetch the infinite feed
   * once, only refresh it manually via query.refetch.
   */
  reduceAutomaticRefetch?: boolean;
}) {
  const queryClient = useQueryClient();
  const throttleQueue = useThrottleQueue(options.queryKey);
  const queryFn = options.queryFn;

  const truncate = () => {
    const data = queryClient.getQueryData<InfiniteData<any>>(options.queryKey);
    if (data && isInfiniteQueryData(data)) {
      const pages = queryClient.setQueryData<InfiniteData<any>>(
        options.queryKey,
        {
          pages: data.pages.slice(0, 3),
          pageParams: data.pageParams.slice(0, 3),
        },
      );
      return pages?.pages.length ?? 0;
    }
    return 0;
  };

  const queryKeyStr = JSON.stringify(options.queryKey);
  const isWarmed = useWarmedKeysStore((s) =>
    s.warmedKeys.includes(queryKeyStr),
  );
  const addWarmedKey = useWarmedKeysStore((s) => s.addWarmedKey);

  const query = useInfiniteQuery({
    ...(reduceAutomaticRefetch
      ? {
          refetchOnMount: isWarmed ? false : "always",
          refetchOnWindowFocus: isWarmed ? false : "always",
        }
      : {}),
    ...options,
    ...(_.isFunction(queryFn)
      ? {
          queryFn: (ctx: any) => {
            const pageParam = ctx.pageParam as any;
            return throttleQueue.enqueue<TQueryFnData>(async () => {
              addWarmedKey(queryKeyStr);
              const value = await queryFn(ctx);
              try {
                const prev = queryClient.getQueryData<InfiniteData<any, any>>(
                  options.queryKey,
                );
                if (prev && isInfiniteQueryData(prev)) {
                  const pageIndex = prev.pageParams.indexOf(pageParam);
                  if (pageIndex >= 0) {
                    const pages = [...prev.pages];
                    pages[pageIndex] = value;
                    const pageParams = [...prev.pageParams];
                    const nextPage = options.getNextPageParam(
                      value,
                      pages,
                      pageParam,
                      pageParams,
                    );
                    // This is slightly different than how react query typically works,
                    // but without this, pageIndex (above) won't be -1 for the next page.
                    pageParams[pageIndex + 1] = nextPage;
                    queryClient.setQueryData<InfiniteData<any, any>>(
                      options.queryKey,
                      {
                        pages,
                        pageParams,
                      },
                    );
                  }
                }
              } catch {}
              return value;
            });
          },
        }
      : {}),
  });

  // You're aparently not supposed to destructure query,
  // (e.g. { ...query }) so we just overwrite the functions directly.
  const fetchNextPage = query.fetchNextPage;
  query.fetchNextPage = () => {
    const p = fetchNextPage();
    throttleQueue.flush();
    return p;
  };

  const refetch = query.refetch;
  query.refetch = (refetchOptions) => {
    const numPages = truncate();
    throttleQueue.preApprove(numPages);
    return refetch(refetchOptions);
  };

  return query;
}
