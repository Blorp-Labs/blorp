import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardHeight } from "./index";

describe("useKeyboardHeight", () => {
  beforeEach(() => {
    document.body.style.removeProperty("--keyboard-height");
  });
  afterEach(() => {
    document.body.style.removeProperty("--keyboard-height");
  });

  test("returns 0 when var unset", () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });

  test("reads initial value from --keyboard-height on body", () => {
    document.body.style.setProperty("--keyboard-height", "300px");
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(300);
  });

  test("updates on window resize", () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
    act(() => {
      document.body.style.setProperty("--keyboard-height", "250px");
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(250);
  });

  test("updates on orientationchange", () => {
    document.body.style.setProperty("--keyboard-height", "100px");
    const { result } = renderHook(() => useKeyboardHeight());
    act(() => {
      document.body.style.setProperty("--keyboard-height", "0");
      window.dispatchEvent(new Event("orientationchange"));
    });
    expect(result.current).toBe(0);
  });

  test("treats non-numeric var as 0", () => {
    document.body.style.setProperty("--keyboard-height", "");
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });
});
