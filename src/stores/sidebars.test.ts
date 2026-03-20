import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import { useSidebarStore } from "./sidebars";
import _ from "lodash";

afterEach(() => {
  const { result } = renderHook(() => useSidebarStore());
  act(() => {
    result.current.reset();
  });
});

describe("persisted state snapshot", () => {
  test("sidebar store initial shape", () => {
    const { result } = renderHook(() => useSidebarStore());

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
