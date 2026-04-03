import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Real timers — React Query's internal scheduling uses microtasks/Promises
// which don't play well with vi.useFakeTimers(). The throttle queue's first
// task fires after the real 50ms tickTime, which waitFor() handles fine.

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

// H4a — PRIMARY (diagnostic): verifies the safe path where enabled starts false.
// lastResolvedAt is at Date.now()-interval from the constructor, so the first
// task after enable runs immediately after tickTime. This PASSES, confirming
// the freeze only occurs on revisits where the queue instance is reused with a
// stale lastResolvedAt (tested directly in throttle-queue.test.ts).
describe("H4a — comments: enabled false→true loads promptly on first visit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("comments load promptly when enabled transitions false→true", async () => {
    const { useThrottledInfiniteQuery } = await import(
      "./throttled-infinite-query"
    );

    const queryFn = vi.fn().mockResolvedValue({
      comments: [],
      nextCursor: undefined,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useThrottledInfiniteQuery({
          queryKey: ["comments", "post-1"],
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          refetchOnMount: "always",
          enabled,
        }),
      { wrapper: makeWrapper(queryClient), initialProps: { enabled: false } },
    );

    // Wait longer than tickTime — no fetch should fire while disabled
    await sleep(100);
    expect(queryFn).toHaveBeenCalledTimes(0);

    // parentComment resolves → enabled flips true
    rerender({ enabled: true });

    // PASSES — initial load fires immediately (fresh constructor lastResolvedAt)
    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 500,
    });
  });
});

// H1 — SECONDARY: addWarmedKey is called before `await queryFn(ctx)`, so a
// failed or aborted fetch permanently marks the key as "warmed". On the next
// mount, refetchOnMount: false suppresses the auto-refetch → query freezes.
describe("H1 — posts feed: addWarmedKey called before await (reduceAutomaticRefetch)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // H1 variant: queryFn throws after the task starts (addWarmedKey already called).
  // Expected: FAILS — proves the bug (query stays frozen on remount).
  test("posts feed stays frozen after queryFn throws with reduceAutomaticRefetch", async () => {
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
    // so the remount sees isWarmed=true AND the cached error state.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = makeWrapper(queryClient);
    const queryKey = ["posts-feed-h1-throw"];

    // First mount: task fires after tickTime, addWarmedKey called, queryFn throws
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
    unmount();

    // callCount > 1 so subsequent calls succeed — the bug prevents this from mattering
    const { result } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          reduceAutomaticRefetch: true,
        }),
      { wrapper }, // same QueryClient — isWarmed=true persists in Zustand
    );

    // FAILS — proves H1: isWarmed=true → refetchOnMount=false → no refetch → frozen
    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 300,
    });
  });

  // H2 safe path: component unmounts before the 50ms queue tick fires.
  // queue.clear() rejects the task before addWarmedKey is ever called.
  // isWarmed stays false → remount refetches normally.
  // Expected: PASSES — confirms H2 is NOT the freeze path.
  test("posts feed recovers when unmounted before queue tick fires (H2 safe path)", async () => {
    const { useThrottledInfiniteQuery } = await import(
      "./throttled-infinite-query"
    );

    const queryFn = vi.fn().mockResolvedValue({
      posts: [],
      nextCursor: undefined,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = makeWrapper(queryClient);
    const queryKey = ["posts-feed-h2"];

    // Let React Query's microtask fire so queryFn is enqueued in the queue,
    // then unmount before the 50ms tick — queue.clear() rejects the task
    // before it starts executing, so addWarmedKey is never called.
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
    await Promise.resolve(); // let React Query's microtask fire and enqueue the queryFn
    unmount(); // queue.clear() rejects the queued task before the 50ms tick fires
    await sleep(0); // macrotask boundary — flushes all pending microtasks so the
    // rejection propagates fully through React Query before we remount

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

    // PASSES — H2 is the safe path (addWarmedKey never called, isWarmed stays false)
    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 500,
    });
  });

  // H1 abort variant: fetch starts, addWarmedKey called, then the in-flight
  // promise is rejected (simulating navigation away mid-request).
  // Expected: FAILS — proves the H1 abort bug.
  test("posts feed stays frozen after in-flight fetch is aborted with reduceAutomaticRefetch", async () => {
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
    const queryKey = ["posts-feed-h1-abort"];

    // Mount: after tickTime the task starts — addWarmedKey called, queryFn hangs
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

    // Wait for tick to fire so addWarmedKey is definitely called
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });

    // Abort the in-flight fetch (simulates navigating away mid-request)
    rejectInFlight!(new Error("AbortError"));
    await sleep(50); // let the rejection propagate

    unmount();
    shouldHang = false;

    // Remount — isWarmed=true in Zustand, query in error state in cache
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

    // FAILS — proves H1 abort: isWarmed=true → refetchOnMount=false → frozen
    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 300,
    });
  });

  // Regression: without reduceAutomaticRefetch, a failed fetch does not freeze
  // the query on remount — refetchOnMount is not suppressed by isWarmed.
  // Expected: PASSES — confirms reduceAutomaticRefetch is the specific culprit.
  test("query recovers after error without reduceAutomaticRefetch (regression)", async () => {
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

    const { unmount } = renderHook(
      () =>
        useThrottledInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: "",
          getNextPageParam: (data: any) => data.nextCursor,
          // no reduceAutomaticRefetch
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });
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

    // PASSES — no reduceAutomaticRefetch means refetchOnMount is not suppressed
    await waitFor(() => expect(result.current.status).toBe("success"), {
      timeout: 500,
    });
  });
});
