import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import { useSearchStore } from "./search";
import _ from "lodash";

afterEach(() => {
  useSearchStore.getState().reset();
});

describe("persisted state snapshot", () => {
  test("search store shape", () => {
    const { result } = renderHook(() => useSearchStore());

    act(() => {
      result.current.saveSearch("lemmy");
    });

    expect(result.current.searchHistory).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
