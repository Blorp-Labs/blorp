import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import z from "zod";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPathname = "/lightbox";
let mockSearch = "";

vi.mock("@/src/routing/hooks", () => ({
  usePathname: () => mockPathname,
}));

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("react-router-dom", () => ({
  useHistory: () => ({ replace: mockReplace, push: mockPush }),
  useLocation: () => ({
    pathname: mockPathname,
    search: mockSearch,
    hash: "",
    state: null,
  }),
}));

vi.mock("@ionic/react", () => ({
  useIonAlert: () => [vi.fn()],
}));

// Import after mocks are set up
import { useUrlSearchState } from "./index";

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockPathname = "/lightbox";
  mockSearch = "";
  mockReplace.mockClear();
  mockPush.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useUrlSearchState", () => {
  test("setValue updates history when route is active", () => {
    const { result } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    act(() => {
      result.current[1]("2");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ search: "?page=2" }),
    );
  });

  test("setValue does NOT update history after route becomes inactive", () => {
    const { result, rerender } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    // Queue a URL update while active
    act(() => {
      result.current[1]("2");
    });

    // Simulate navigating away — pathname changes so isActive becomes false
    act(() => {
      mockPathname = "/home";
      rerender();
    });

    // Now let the timeout fire
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("removeParam does NOT update history after route becomes inactive", () => {
    mockSearch = "?page=2";

    const { result, rerender } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    // Queue a removeParam while active
    act(() => {
      result.current[2]();
    });

    // Navigate away
    act(() => {
      mockPathname = "/home";
      rerender();
    });

    // Let the timeout fire
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("pending timeouts are cleared when route becomes inactive", () => {
    const { result, rerender } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    // Queue multiple URL updates
    act(() => {
      result.current[1]("2");
      result.current[1]("3");
      result.current[1]("4");
    });

    // Navigate away before timeouts fire
    act(() => {
      mockPathname = "/home";
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
