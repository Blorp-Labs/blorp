import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, afterEach } from "vitest";
import { useTagUserStore } from "./user-tags";
import _ from "lodash";

afterEach(() => {
  useTagUserStore.getState().reset();
});

describe("merge (cross-tab version skew protection)", () => {
  test("accepts valid persisted user tags", () => {
    const merge = useTagUserStore.persist.getOptions().merge!;
    const result = merge(
      { userTags: { "user@example.com": "My Friend" } },
      useTagUserStore.getState(),
    );

    expect(result.userTags["user@example.com"]).toBe("My Friend");
  });

  test("rejects persisted user tags with invalid schema", () => {
    const merge = useTagUserStore.persist.getOptions().merge!;
    const result = merge(
      { userTags: { "user@example.com": { notAString: true } } },
      useTagUserStore.getState(),
    );

    expect(result.userTags).toEqual({});
  });
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
