import { describe, test, expect, afterEach } from "vitest";
import {
  useRecentCommunitiesStore,
  MAX_VISITED,
  migrateRecentCommunities,
} from "./recent-communities";
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

// ─── migration ──────────────────────────────────────────────────────────────

describe("migrateRecentCommunities", () => {
  test("v1 → v2: renames slug to handle on communities", () => {
    const community = api.getCommunity({ id: 1 });
    const { handle, ...rest } = community;
    const oldData = { recentlyVisited: [{ ...rest, slug: handle }] };

    const migrated = migrateRecentCommunities(oldData);
    expect(migrated.recentlyVisited[0]?.handle).toBe(handle);
    expect(migrated.recentlyVisited[0]).not.toHaveProperty("slug");
  });

  test("idempotent when handle already present", () => {
    const community = api.getCommunity({ id: 1 });
    const migrated = migrateRecentCommunities({
      recentlyVisited: [community],
    });
    expect(migrated.recentlyVisited[0]?.handle).toBe(community.handle);
  });

  test("handles empty recentlyVisited", () => {
    const migrated = migrateRecentCommunities({ recentlyVisited: [] });
    expect(migrated.recentlyVisited).toEqual([]);
  });

  test("handles missing recentlyVisited key", () => {
    const migrated = migrateRecentCommunities({});
    expect(migrated.recentlyVisited).toEqual([]);
  });

  test("migrates multiple communities", () => {
    const c1 = api.getCommunity({ id: 1 });
    const c2 = api.getCommunity({ id: 2 });
    const oldData = {
      recentlyVisited: [
        { ..._.omit(c1, "handle"), slug: c1.handle },
        { ..._.omit(c2, "handle"), slug: c2.handle },
      ],
    };
    const migrated = migrateRecentCommunities(oldData);
    expect(migrated.recentlyVisited[0]?.handle).toBe(c1.handle);
    expect(migrated.recentlyVisited[1]?.handle).toBe(c2.handle);
  });
});
