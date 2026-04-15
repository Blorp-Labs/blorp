import { describe, test, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEvent } from "./use-event";

describe("useEvent", () => {
  test("returns stable reference across re-renders", () => {
    const { result, rerender } = renderHook(() => useEvent(() => 42));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  test("calls the latest version of the function", () => {
    let value = "a";
    const { result, rerender } = renderHook(() => useEvent(() => value));

    expect(result.current()).toBe("a");

    value = "b";
    rerender();

    // Same stable ref, but calls updated closure
    expect(result.current()).toBe("b");
  });

  test("forwards arguments correctly", () => {
    const spy = vi.fn((x: number, y: number) => x + y);
    const { result } = renderHook(() => useEvent(spy));

    expect(result.current(2, 3)).toBe(5);
    expect(spy).toHaveBeenCalledWith(2, 3);
  });

  test("stable ref across closure changes does not cause re-render loops", () => {
    let renderCount = 0;
    const { rerender } = renderHook(() => {
      renderCount++;
      return useEvent(() => renderCount);
    });

    const before = renderCount;
    rerender();
    // Should only increment by exactly one re-render, not loop
    expect(renderCount).toBe(before + 1);
  });
});
