import { describe, test, expect, afterEach } from "vitest";
import { useSettingsStore } from "./settings";
import { renderHook, act } from "@testing-library/react";
import _ from "lodash";

afterEach(() => {
  const { result } = renderHook(() => useSettingsStore());
  act(() => {
    result.current.reset();
  });
});

describe("useSettingsStore", () => {
  test("setFilterKeywords", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setFilterKeywords({ index: 0, keyword: "one" });
      result.current.setFilterKeywords({ index: 1, keyword: "two" });
      result.current.setFilterKeywords({ index: 2, keyword: "three" });
    });

    expect(result.current.filterKeywords).toEqual(["one", "two", "three"]);
  });

  test("pruneFilterKeywords", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setFilterKeywords({ index: 0, keyword: "one" });
      result.current.setFilterKeywords({ index: 1, keyword: "two" });
      result.current.setFilterKeywords({ index: 2, keyword: "three" });
      result.current.setFilterKeywords({ index: 3, keyword: "" });
    });

    expect(result.current.filterKeywords).toHaveLength(4);

    act(() => {
      result.current.pruneFiltersKeywords();
    });

    expect(result.current.filterKeywords).toHaveLength(3);
  });
});

describe("persisted state snapshot", () => {
  test("settings store initial shape", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.reset();
    });

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
