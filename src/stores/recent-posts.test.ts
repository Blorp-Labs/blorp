import { describe, test, expect, afterEach } from "vitest";
import { useRecentPostsStore, MAX_VISITED } from "./recent-posts";
import * as api from "@/test-utils/api";
import { renderHook, act } from "@testing-library/react";
import _ from "lodash";

function makeEntry(id: number) {
  const { post, creator, community } = api.getPost({ post: { id } });
  return {
    apId: post.apId,
    accountUuid: undefined,
    post,
    creator,
    community,
  } as const;
}

afterEach(() => {
  const { result } = renderHook(() => useRecentPostsStore());
  act(() => {
    result.current.reset();
  });
});

describe("useRecentPostsStore", () => {
  test("starts empty", () => {
    const { result } = renderHook(() => useRecentPostsStore());
    expect(result.current.recentlyVisited).toHaveLength(0);
  });

  test("adds an entry", () => {
    const entry = makeEntry(1);
    const { result } = renderHook(() => useRecentPostsStore());

    act(() => {
      result.current.update(entry);
    });

    expect(result.current.recentlyVisited).toHaveLength(1);
    expect(result.current.recentlyVisited[0]?.apId).toBe(entry.apId);
  });

  test("deduplicates by apId, moving the entry to the front", () => {
    const entry1 = makeEntry(1);
    const entry2 = makeEntry(2);
    const { result } = renderHook(() => useRecentPostsStore());

    act(() => {
      result.current.update(entry1);
      result.current.update(entry2);
      result.current.update(entry1);
    });

    expect(result.current.recentlyVisited).toHaveLength(2);
    expect(result.current.recentlyVisited[0]?.apId).toBe(entry1.apId);
  });

  test("places most recently visited at the front", () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry(i + 1));
    const { result } = renderHook(() => useRecentPostsStore());

    act(() => {
      for (const entry of entries) {
        result.current.update(entry);
      }
    });

    expect(result.current.recentlyVisited[0]?.apId).toBe(
      entries[entries.length - 1]?.apId,
    );
  });

  test(`caps at ${MAX_VISITED} entries`, () => {
    const entries = Array.from({ length: MAX_VISITED * 2 }, (_, i) =>
      makeEntry(i + 1),
    );
    const { result } = renderHook(() => useRecentPostsStore());

    act(() => {
      for (const entry of entries) {
        result.current.update(entry);
      }
    });

    expect(result.current.recentlyVisited).toHaveLength(MAX_VISITED);
  });

  test("stores accountUuid alongside the entry", () => {
    const entry = { ...makeEntry(1), accountUuid: "account-abc" };
    const { result } = renderHook(() => useRecentPostsStore());

    act(() => {
      result.current.update(entry);
    });

    expect(result.current.recentlyVisited[0]?.accountUuid).toBe("account-abc");
  });
});

describe("persisted state snapshot", () => {
  test("recent posts store shape", () => {
    const base = makeEntry(1);
    const FIXED_TIME = "2025-01-30T11:00:00.000000Z";
    const entry = {
      ...base,
      post: { ...base.post, createdAt: FIXED_TIME },
      creator: { ...base.creator, createdAt: FIXED_TIME },
    };
    const { result } = renderHook(() => useRecentPostsStore());

    act(() => {
      result.current.update(entry);
    });

    expect(result.current.recentlyVisited).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
