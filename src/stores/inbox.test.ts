import { renderHook } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import { useInboxStore } from "./inbox";
import _ from "lodash";

afterEach(() => {
  useInboxStore.getState().reset();
});

describe("persisted state snapshot", () => {
  test("inbox store initial shape", () => {
    const { result } = renderHook(() => useInboxStore());

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
