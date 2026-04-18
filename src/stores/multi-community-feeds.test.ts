import {
  describe,
  test,
  expect,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import * as api from "@/test-utils/api";
import { useMultiCommunityFeedStore } from "./multi-community-feeds";
import { renderHook, act } from "@testing-library/react";
import { getCachePrefixer } from "./auth";
import { normalizeInstance } from "../normalize-instance";
import { getFeedSubscribed } from "../apis/utils";
import _ from "lodash";

const prefix = getCachePrefixer({
  instance: normalizeInstance("lemmy.world"),
  uuid: "test",
});

afterEach(() => {
  const { result } = renderHook(() => useMultiCommunityFeedStore());
  act(() => {
    result.current.reset();
  });
});

describe("useMultiCommunityFeedStore", () => {
  describe("cacheFeeds", () => {
    test("loads feed into store", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed();

      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView,
      ).toMatchObject(feedView);
    });

    test("clears optimisticSubscribed when fresh server data arrives", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed();

      act(() => {
        result.current.cacheFeeds(prefix, [
          { feedView: { ...feedView, optimisticSubscribed: "Pending" } },
        ]);
      });

      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView
          .optimisticSubscribed,
      ).toBeUndefined();
    });

    test("preserves cached communityHandles when incoming view omits them", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const communityHandles = [
        "a@example.com",
        "b@example.com",
      ] satisfies `${string}@${string}`[];
      const feedView = api.getFeed({ communityHandles });

      // Prime the cache with communityHandles
      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      // Simulate a list-endpoint response that omits communityHandles
      act(() => {
        result.current.cacheFeeds(prefix, [
          { feedView: { ...feedView, communityHandles: undefined } },
        ]);
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView
          .communityHandles,
      ).toEqual(communityHandles);
    });

    test("respects explicit empty communityHandles as genuinely empty", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed({
        communityHandles: ["a@example.com"],
      });

      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      act(() => {
        result.current.cacheFeeds(prefix, [
          { feedView: { ...feedView, communityHandles: [] } },
        ]);
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView
          .communityHandles,
      ).toEqual([]);
    });

    test("communityHandles remains undefined on cold cache when incoming view omits them", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed({ communityHandles: undefined });

      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView
          .communityHandles,
      ).toBeUndefined();
    });
  });

  describe("patchFeed", () => {
    test("does not patch a feed that is not already in the store", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed();

      act(() => {
        result.current.patchFeed(feedView.apId, prefix, {
          optimisticSubscribed: "Pending",
        });
      });

      expect(result.current.feeds[prefix(feedView.apId)]?.data).toBeUndefined();
    });

    test("applies patch to an existing feed", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed();

      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      act(() => {
        result.current.patchFeed(feedView.apId, prefix, {
          optimisticSubscribed: "Pending",
        });
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView
          .optimisticSubscribed,
      ).toBe("Pending");
    });

    test("preserves unpatched fields", () => {
      const { result } = renderHook(() => useMultiCommunityFeedStore());
      const feedView = api.getFeed({ name: "My Feed" });

      act(() => {
        result.current.cacheFeeds(prefix, [{ feedView }]);
      });

      act(() => {
        result.current.patchFeed(feedView.apId, prefix, {
          optimisticSubscribed: "NotSubscribed",
        });
      });

      expect(
        result.current.feeds[prefix(feedView.apId)]?.data.feedView.name,
      ).toBe("My Feed");
    });
  });
});

describe("getFeedSubscribed", () => {
  test("returns Subscribed when subscribed is true", () => {
    expect(getFeedSubscribed(api.getFeed({ subscribed: true }))).toBe(
      "Subscribed",
    );
  });

  test("returns NotSubscribed when subscribed is false", () => {
    expect(getFeedSubscribed(api.getFeed({ subscribed: false }))).toBe(
      "NotSubscribed",
    );
  });

  test("returns NotSubscribed when subscribed is null", () => {
    expect(getFeedSubscribed(api.getFeed({ subscribed: null }))).toBe(
      "NotSubscribed",
    );
  });

  test("optimisticSubscribed takes precedence over subscribed", () => {
    expect(
      getFeedSubscribed(
        api.getFeed({ subscribed: false, optimisticSubscribed: "Subscribed" }),
      ),
    ).toBe("Subscribed");

    expect(
      getFeedSubscribed(
        api.getFeed({
          subscribed: true,
          optimisticSubscribed: "NotSubscribed",
        }),
      ),
    ).toBe("NotSubscribed");

    expect(
      getFeedSubscribed(
        api.getFeed({ subscribed: false, optimisticSubscribed: "Pending" }),
      ),
    ).toBe("Pending");
  });
});

describe("merge (cross-tab version skew protection)", () => {
  test("accepts valid persisted feeds", () => {
    const feedView = api.getFeed({ id: 1 });
    const key = prefix(feedView.apId);

    const merge = useMultiCommunityFeedStore.persist.getOptions().merge!;
    const result = merge(
      { feeds: { [key]: { data: { feedView }, lastUsed: Date.now() } } },
      useMultiCommunityFeedStore.getState(),
    );

    expect(result.feeds[key]?.data.feedView).toMatchObject(feedView);
  });

  test("rejects persisted feeds with invalid schema", () => {
    const merge = useMultiCommunityFeedStore.persist.getOptions().merge!;
    const result = merge(
      { feeds: { "some-key": { outdatedField: "old format" } } },
      useMultiCommunityFeedStore.getState(),
    );

    expect(result.feeds).toEqual({});
  });
});

const FIXED_DATE = new Date("2024-01-01T00:00:00.000Z");

describe("persisted state snapshot", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("feeds store shape", () => {
    const feedView = api.getFeed({ id: 1 });
    const { result } = renderHook(() => useMultiCommunityFeedStore());

    act(() => {
      result.current.cacheFeeds(prefix, [{ feedView }]);
    });

    expect(result.current.feeds).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
