import { renderHook } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { useInboxStore } from "./inbox";
import _ from "lodash";

describe("persisted state snapshot", () => {
  test("inbox store initial shape", () => {
    const { result } = renderHook(() => useInboxStore());

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
