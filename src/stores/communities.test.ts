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
import { useCommunitiesStore } from "./communities";
import _ from "lodash";
import { renderHook, act } from "@testing-library/react";
import { SubscribedType } from "lemmy-v3";
import { getCachePrefixer } from "./auth";

const prefix = getCachePrefixer({ instance: "123", uuid: "test" });

afterEach(() => {
  const { result } = renderHook(() => useCommunitiesStore());
  act(() => {
    result.current.reset();
  });
});

describe("useCommunitiesStore", () => {
  describe("cacheCommunity", () => {
    const communityView = api.getCommunity();
    const handle = communityView.handle;

    test("load post into store", () => {
      const { result } = renderHook(() => useCommunitiesStore());

      act(() => {
        result.current.cacheCommunity(prefix, {
          communityView,
        });
      });

      expect(result.current.communities[prefix(handle)]?.data).toMatchObject({
        communityView,
      });
    });

    test("does not overwrite optimistic subscribed", () => {
      const { result } = renderHook(() => useCommunitiesStore());
      const optimisticSubscribed = _.sample([
        "Subscribed",
        "Pending",
        "NotSubscribed",
      ] satisfies SubscribedType[]);

      act(() => {
        result.current.cacheCommunity(prefix, {
          communityView: {
            ...communityView,
            optimisticSubscribed,
          },
        });
      });

      act(() => {
        result.current.cacheCommunity(prefix, {
          communityView,
        });
      });

      expect(
        result.current.communities[prefix(handle)]?.data.communityView
          .optimisticSubscribed,
      ).toBe(optimisticSubscribed);
    });

    test.todo("patches do not overwrite community mod list");
  });

  describe("patchCommunity", () => {
    const communityView = api.getCommunity();
    const handle = communityView.handle;

    test("does not patch post that is not already in the store", () => {
      const { result } = renderHook(() => useCommunitiesStore());

      act(() => {
        result.current.patchCommunity(handle, prefix, {
          communityView,
        });
      });

      expect(result.current.communities[prefix(handle)]?.data).toBeUndefined();
    });

    test("does not overwrite optimistic subscribed", () => {
      const { result } = renderHook(() => useCommunitiesStore());

      act(() => {
        result.current.cacheCommunity(prefix, {
          communityView,
        });
      });

      const optimisticSubscribed = _.sample([
        "Subscribed",
        "Pending",
        "NotSubscribed",
      ] satisfies SubscribedType[]);

      act(() => {
        result.current.patchCommunity(handle, prefix, {
          communityView: {
            ...communityView,
            optimisticSubscribed,
          },
        });
      });

      act(() => {
        result.current.patchCommunity(handle, prefix, {
          communityView,
        });
      });

      expect(
        result.current.communities[prefix(handle)]?.data.communityView
          .optimisticSubscribed,
      ).toBe(optimisticSubscribed);
    });

    test.todo("patches do not overwrite community mod list");
  });

  describe("cacheCommunities", () => {
    const communityView1 = api.getCommunity({ id: 1 });
    const handle1 = communityView1.handle;
    const communityView2 = api.getCommunity({ id: 2 });
    const handle2 = communityView2.handle;

    test("load communities into store", () => {
      const { result } = renderHook(() => useCommunitiesStore());

      act(() => {
        result.current.cacheCommunities(prefix, [
          { communityView: communityView1 },
          { communityView: communityView2 },
        ]);
      });

      expect(
        result.current.communities[prefix(handle1)]?.data.communityView,
      ).toMatchObject(communityView1);
      expect(
        result.current.communities[prefix(handle2)]?.data.communityView,
      ).toMatchObject(communityView2);
    });

    test("does not overwrite optimistic subscribed", () => {
      const { result } = renderHook(() => useCommunitiesStore());

      const optimisticSubscribed = _.sample([
        "Subscribed",
        "Pending",
        "NotSubscribed",
      ] satisfies SubscribedType[]);

      act(() => {
        result.current.cacheCommunities(prefix, [
          {
            communityView: {
              ...communityView1,
              optimisticSubscribed,
            },
          },
          { communityView: { ...communityView2, optimisticSubscribed } },
        ]);
      });

      act(() => {
        result.current.cacheCommunities(prefix, [
          { communityView: communityView1 },
          { communityView: communityView2 },
        ]);
      });

      expect(
        result.current.communities[prefix(handle1)]?.data.communityView
          .optimisticSubscribed,
      ).toBe(optimisticSubscribed);
      expect(
        result.current.communities[prefix(handle2)]?.data.communityView
          .optimisticSubscribed,
      ).toBe(optimisticSubscribed);
    });

    test.todo("patches do not overwrite community mod list");
  });
});

describe("merge (cross-tab version skew protection)", () => {
  test("accepts valid persisted communities", () => {
    const communityView = api.getCommunity({ id: 1 });
    const key = prefix(communityView.handle);

    const merge = useCommunitiesStore.persist.getOptions().merge!;
    const result = merge(
      {
        communities: {
          [key]: { data: { communityView }, lastUsed: Date.now() },
        },
      },
      useCommunitiesStore.getState(),
    );

    expect(result.communities[key]?.data.communityView).toMatchObject(
      communityView,
    );
  });

  test("rejects persisted communities with invalid schema", () => {
    const merge = useCommunitiesStore.persist.getOptions().merge!;
    const result = merge(
      { communities: { "some-key": { outdatedField: "old format" } } },
      useCommunitiesStore.getState(),
    );

    expect(result.communities).toEqual({});
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

  test("communities store shape", () => {
    const communityView = api.getCommunity({ id: 1 });
    const { result } = renderHook(() => useCommunitiesStore());

    act(() => {
      result.current.cacheCommunity(prefix, { communityView });
    });

    expect(result.current.communities).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
