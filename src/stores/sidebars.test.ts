import { renderHook } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { useSidebarStore } from "./sidebars";
import _ from "lodash";

describe("persisted state snapshot", () => {
  test("sidebar store initial shape", () => {
    const { result } = renderHook(() => useSidebarStore());

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
