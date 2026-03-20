import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import { useTagUserStore } from "./user-tags";
import _ from "lodash";

afterEach(() => {
  useTagUserStore.getState().reset();
});

describe("persisted state snapshot", () => {
  test("user tags store shape", () => {
    const { result } = renderHook(() => useTagUserStore());

    act(() => {
      result.current.setUserTag("user@example.com", "My Friend");
    });

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
