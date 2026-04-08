import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsStale } from "./use-is-stale";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useIsStale", () => {
  test("is immediately stale when dataUpdatedAt is 0", () => {
    const { result } = renderHook(() =>
      useIsStale({ dataUpdatedAt: 0 }, 60_000),
    );
    expect(result.current).toBe(true);
  });

  test("is not stale when just fetched", () => {
    const now = Date.now();
    const { result } = renderHook(() =>
      useIsStale({ dataUpdatedAt: now }, 60_000),
    );
    expect(result.current).toBe(false);
  });

  test("is immediately stale when dataUpdatedAt is older than staleMs", () => {
    const staleTime = Date.now() - 61_000;
    const { result } = renderHook(() =>
      useIsStale({ dataUpdatedAt: staleTime }, 60_000),
    );
    expect(result.current).toBe(true);
  });

  test("flips to stale after staleMs elapses", () => {
    const now = Date.now();
    const { result } = renderHook(() =>
      useIsStale({ dataUpdatedAt: now }, 60_000),
    );

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(true);
  });

  test("does not flip before staleMs elapses", () => {
    const now = Date.now();
    const { result } = renderHook(() =>
      useIsStale({ dataUpdatedAt: now }, 60_000),
    );

    act(() => {
      vi.advanceTimersByTime(59_999);
    });

    expect(result.current).toBe(false);
  });

  test("resets timer and flips back to fresh when dataUpdatedAt updates", () => {
    const initial = Date.now();
    let dataUpdatedAt = initial;

    const { result, rerender } = renderHook(() =>
      useIsStale({ dataUpdatedAt }, 60_000),
    );

    // Advance close to stale
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(result.current).toBe(false);

    // Simulate a refetch — dataUpdatedAt advances
    act(() => {
      dataUpdatedAt = Date.now();
      rerender();
    });

    // Should be fresh again
    expect(result.current).toBe(false);

    // Original timer would have fired by now, but the new timer shouldn't
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(result.current).toBe(false);

    // New timer fires
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(true);
  });

  test("accounts for time already elapsed when dataUpdatedAt is in the past", () => {
    const fetchedAt = Date.now() - 30_000;
    const { result } = renderHook(() =>
      useIsStale({ dataUpdatedAt: fetchedAt }, 60_000),
    );

    expect(result.current).toBe(false);

    // Only 30s remain until stale
    act(() => {
      vi.advanceTimersByTime(29_999);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });
});
