import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import { useFiltersStore } from "./filters";
import _ from "lodash";
import { CommentSortType, ListingType, SortType } from "lemmy-v3";

afterEach(() => {
  const { result } = renderHook(() => useFiltersStore());
  act(() => {
    result.current.reset();
  });
});

describe("useFiltersStore", () => {
  describe("communitySort", () => {
    const { result } = renderHook(() => useFiltersStore());

    test("default value", () => {
      expect(result.current.communitySort).toBe("TopAll");
    });

    test.each([["Active"], ["Hot"], ["New"], ["Old"]] satisfies [SortType][])(
      "change sort %s",
      (sort) => {
        act(() => {
          result.current.setCommunitySort(sort);
        });
        expect(result.current.communitySort).toBe(sort);
      },
    );
  });

  describe("commentSort", () => {
    const { result } = renderHook(() => useFiltersStore());

    test("default value", () => {
      expect(result.current.commentSort).toBe("Hot");
    });

    test.each([["Top"], ["Hot"], ["New"], ["Old"]] satisfies [
      CommentSortType,
    ][])("change sort %s", (sort) => {
      act(() => {
        result.current.setCommentSort(sort);
      });
      expect(result.current.commentSort).toBe(sort);
    });
  });

  describe("postSort", () => {
    const { result } = renderHook(() => useFiltersStore());

    test("default value", () => {
      expect(result.current.postSort).toBe("Active");
    });

    test.each([["Active"], ["Hot"], ["New"], ["Old"]] satisfies [SortType][])(
      "change sort %s",
      (sort) => {
        act(() => {
          result.current.setPostSort(sort);
        });
        expect(result.current.postSort).toBe(sort);
      },
    );
  });

  describe("listingType", () => {
    const { result } = renderHook(() => useFiltersStore());

    test("default value", () => {
      expect(result.current.listingType).toBe("All");
    });

    test.each([
      ["All"],
      ["Local"],
      ["Subscribed"],
      ["ModeratorView"],
    ] satisfies [ListingType][])("change sort %s", (listingType) => {
      act(() => {
        result.current.setListingType(listingType);
      });
      expect(result.current.listingType).toBe(listingType);
    });
  });

  describe("communitiesListingType", () => {
    const { result } = renderHook(() => useFiltersStore());

    test("default value", () => {
      expect(result.current.communitiesListingType).toBe("All");
    });

    test.each([
      ["All"],
      ["Local"],
      ["Subscribed"],
      ["ModeratorView"],
    ] satisfies [ListingType][])("change sort %s", (listingType) => {
      act(() => {
        result.current.setCommunitiesListingType(listingType);
      });
      expect(result.current.communitiesListingType).toBe(listingType);
    });
  });
});

describe("persisted state snapshot", () => {
  test("filters store initial shape", () => {
    const { result } = renderHook(() => useFiltersStore());

    act(() => {
      result.current.reset();
    });

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
