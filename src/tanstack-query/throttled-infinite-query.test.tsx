import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Real timers — React Query's internal scheduling uses microtasks/Promises
// which don't play well with vi.useFakeTimers().

afterEach(cleanup);

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// reduceAutomaticRefetch suppresses refetchOnMount once a query has been
// fetched successfully. These tests verify that a failed or aborted fetch
// does not permanently suppress future refetches.
describe("reduceAutomaticRefetch — refetchOnMount not suppressed by failed fetch", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("query recovers on remount after queryFn throws", async () => {
    const { useThrottledInfiniteQuery } = await import(
      "./throttled-infinite-query"
    );

    let callCount = 0;
    const queryFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network error");
      }
      return { posts: [], nextCursor: undefined };
    });

    // gcTime: Infinity keeps the error state in cache after unmount,
    // so the remount sees the cached error state but should still refetch.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = makeWrapper(queryClient);
    const queryKey = ["posts-feed-throw"];

    // User visits the posts feed — fetch fires and throws
    const { unmount } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          reduceAutomaticRefetch: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });

    // User navigates away
    unmount();

    // User navigates back — should refetch and recover
    const { result } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          reduceAutomaticRefetch: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 300,
    });
  });

  test("query recovers on remount after in-flight fetch is aborted", async () => {
    const { useThrottledInfiniteQuery } = await import(
      "./throttled-infinite-query"
    );

    let rejectInFlight: ((err: Error) => void) | undefined;
    let shouldHang = true;
    const queryFn = vi.fn(() => {
      if (shouldHang) {
        return new Promise<{ posts: []; nextCursor: undefined }>(
          (_, reject) => {
            rejectInFlight = reject;
          },
        );
      }
      return Promise.resolve({ posts: [] as [], nextCursor: undefined });
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = makeWrapper(queryClient);
    const queryKey = ["posts-feed-abort"];

    // User visits the posts feed — fetch starts but hangs
    const { unmount } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          reduceAutomaticRefetch: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });

    // User navigates away mid-fetch — the in-flight request is aborted
    rejectInFlight!(new Error("AbortError"));
    await sleep(50); // let the rejection propagate

    unmount();
    shouldHang = false;

    // User navigates back — should refetch and recover
    const { result } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          reduceAutomaticRefetch: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 300,
    });
  });

  test("query without reduceAutomaticRefetch recovers after error", async () => {
    const { useThrottledInfiniteQuery } = await import(
      "./throttled-infinite-query"
    );

    let callCount = 0;
    const queryFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network error");
      }
      return { posts: [], nextCursor: undefined };
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = makeWrapper(queryClient);
    const queryKey = ["posts-feed-regression"];

    // User visits the feed — fetch fires and throws
    const { unmount } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });

    // User navigates away, then back
    unmount();

    const { result } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 500,
    });
  });
});
