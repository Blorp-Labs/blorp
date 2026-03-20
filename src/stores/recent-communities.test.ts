import { describe, test, expect, afterEach } from "vitest";
import { useRecentCommunitiesStore, MAX_VISITED } from "./recent-communities";
import * as api from "@/test-utils/api";
import { renderHook, act } from "@testing-library/react";
import _ from "lodash";

afterEach(() => {
  const { result } = renderHook(() => useRecentCommunitiesStore());
  act(() => {
    result.current.reset();
  });
});

describe("useRecentCommunitiesStore", () => {
  test("omits duplicate communities", () => {
    const community = api.getCommunity();

    const { result } = renderHook(() => useRecentCommunitiesStore());

    expect(result.current.recentlyVisited).toHaveLength(0);

    act(() => {
      result.current.update(community);
    });

    expect(result.current.recentlyVisited).toHaveLength(1);
  });

  test("saves max 5 communities", () => {
    const communities = Array.from({ length: MAX_VISITED * 2 })
      .fill(0)
      .map((_, id) => api.getCommunity({ id }));

    const { result } = renderHook(() => useRecentCommunitiesStore());

    act(() => {
      for (const community of communities) {
        result.current.update(community);
      }
    });

    expect(result.current.recentlyVisited).toHaveLength(MAX_VISITED);
  });

  test("placed most recently visited at beginning of array", () => {
    const communities = Array.from({ length: MAX_VISITED * 2 })
      .fill(0)
      .map((_, id) => api.getCommunity({ id }));

    const { result } = renderHook(() => useRecentCommunitiesStore());

    act(() => {
      for (const community of communities) {
        result.current.update(community);
      }
    });

    expect(result.current.recentlyVisited).toMatchObject(
      communities.slice(communities.length - MAX_VISITED).toReversed(),
    );
  });
});

describe("persisted state snapshot", () => {
  test("recent communities store shape", () => {
    const community = api.getCommunity({ id: 1 });
    const { result } = renderHook(() => useRecentCommunitiesStore());

    act(() => {
      result.current.update(community);
    });

    expect(result.current.recentlyVisited).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
