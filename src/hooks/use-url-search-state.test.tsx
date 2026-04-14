import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import z from "zod";
import {
  RouteSearchParamContext,
  RouteSearchParamProvider,
} from "./use-url-search-state";

// Import after mocks are set up
import { useUrlSearchState } from "./index";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPathname = "/lightbox";
let mockSearch = "";

vi.mock("@/src/hooks/use-pathname", () => ({
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapWithRouteProvider() {
  return ({ children }: { children: React.ReactNode }) => (
    <RouteSearchParamProvider>{children}</RouteSearchParamProvider>
  );
}

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
      result.current.set("2");
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

    act(() => {
      result.current.set("2");
    });

    act(() => {
      mockPathname = "/home";
      rerender();
    });

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

    act(() => {
      result.current.remove();
    });

    act(() => {
      mockPathname = "/home";
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test("pending timeouts are cleared when route becomes inactive", () => {
    const { result, rerender } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    act(() => {
      result.current.set("2");
      result.current.set("3");
      result.current.set("4");
    });

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

describe("useUrlSearchState — default value behavior", () => {
  test("remembers last URL value as default after param is removed from URL", () => {
    mockSearch = "?page=5";

    const { result, rerender } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    // Value should be "5" from URL
    expect(result.current.value).toBe("5");

    // Simulate the URL param disappearing (e.g. external navigation)
    // without calling removeParam
    act(() => {
      mockSearch = "";
      rerender();
    });

    // Should retain "5" (last seen value), NOT reset to "1"
    expect(result.current.value).toBe("5");
  });

  test("removeParam resets default back to initial value", () => {
    mockSearch = "?page=5";

    const { result, rerender } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    expect(result.current.value).toBe("5");

    // Call removeParam — this should reset default to "1"
    act(() => {
      result.current.remove();
    });

    act(() => {
      mockSearch = "";
      vi.advanceTimersByTime(10);
      rerender();
    });

    expect(result.current.value).toBe("1");
  });
});

describe("useUrlSearchState — chaining", () => {
  test("chained remove calls produce a single history.replace with all params removed", () => {
    mockSearch = "?title=hello&url=https://example.com&body=world";

    const { result } = renderHook(() => ({
      title: useUrlSearchState("title", "", z.string()),
      url: useUrlSearchState("url", "", z.string()),
      body: useUrlSearchState("body", "", z.string()),
    }));

    act(() => {
      result.current.title
        .remove()
        .and(result.current.url.remove)
        .and(result.current.body.remove);
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    // Only one history call, with all three params removed
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ search: "" }),
    );
  });

  test("chained set calls produce a single history.replace with all params set", () => {
    const { result } = renderHook(() => ({
      page: useUrlSearchState("page", "1", z.string()),
      sort: useUrlSearchState("sort", "new", z.string()),
    }));

    act(() => {
      result.current.page.set("5").and(result.current.sort.set, "top");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const search = mockReplace.mock.calls[0]?.[0].search;
    const params = new URLSearchParams(search);
    expect(params.get("page")).toBe("5");
    expect(params.get("sort")).toBe("top");
  });
});

describe("useUrlSearchState — onCommit callback", () => {
  test("callback fires after set updates history", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useUrlSearchState("page", "1", z.string()),
    );

    act(() => {
      result.current.set("2", cb);
    });

    expect(cb).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalled();
  });

  test("callback on last .and fires after chained sets", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => ({
      page: useUrlSearchState("page", "1", z.string()),
      sort: useUrlSearchState("sort", "new", z.string()),
    }));

    act(() => {
      result.current.page.set("5").and(result.current.sort.set, "top", cb);
    });

    expect(cb).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("callback on last .and fires after chained removes", () => {
    mockSearch = "?title=hello&url=https://example.com";
    const cb = vi.fn();

    const { result } = renderHook(() => ({
      title: useUrlSearchState("title", "", z.string()),
      url: useUrlSearchState("url", "", z.string()),
    }));

    act(() => {
      result.current.title.remove().and(result.current.url.remove, cb);
    });

    expect(cb).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("all callbacks fire when multiple .and calls each have a callback", () => {
    const order: number[] = [];
    const cb1 = vi.fn(() => order.push(1));
    const cb2 = vi.fn(() => order.push(2));
    const { result } = renderHook(() => ({
      a: useUrlSearchState("a", "", z.string()),
      b: useUrlSearchState("b", "", z.string()),
      c: useUrlSearchState("c", "", z.string()),
    }));

    act(() => {
      result.current.a
        .set("1")
        .and(result.current.b.set, "2", cb1)
        .and(result.current.c.set, "3", cb2);
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(order).toEqual([1, 2]);
  });

  test("callback does NOT fire when route is inactive", () => {
    const cb = vi.fn();
    const { result, rerender } = renderHook(() => ({
      page: useUrlSearchState("page", "1", z.string()),
      sort: useUrlSearchState("sort", "new", z.string()),
    }));

    act(() => {
      result.current.page.set("5").and(result.current.sort.set, "top", cb);
    });

    act(() => {
      mockPathname = "/home";
      rerender();
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("useUrlSearchState — route isolation", () => {
  test("two route instances have isolated defaults", () => {
    mockSearch = "?apId=post-42";

    // Each wrapper creates its own provider with its own Map
    const routeA = renderHook(() => useUrlSearchState("apId", "", z.string()), {
      wrapper: wrapWithRouteProvider(),
    });

    const routeB = renderHook(() => useUrlSearchState("apId", "", z.string()), {
      wrapper: wrapWithRouteProvider(),
    });

    // Both see "post-42" from URL
    expect(routeA.result.current.value).toBe("post-42");
    expect(routeB.result.current.value).toBe("post-42");

    // Call removeParam on route A only
    act(() => {
      routeA.result.current.remove();
    });

    act(() => {
      mockSearch = "";
      vi.advanceTimersByTime(10);
      routeA.rerender();
      routeB.rerender();
    });

    // Route A should reset to initial default ""
    expect(routeA.result.current.value).toBe("");
    // Route B should retain "post-42" (last seen value)
    expect(routeB.result.current.value).toBe("post-42");
  });

  test("two hooks in the same route share the same defaults", () => {
    mockSearch = "?apId=post-42";

    // Share a single Map across two renderHook trees to simulate
    // two hooks under the same RouteSearchParamProvider
    const sharedDefaults = new Map<string, unknown>();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RouteSearchParamContext value={sharedDefaults}>
        {children}
      </RouteSearchParamContext>
    );

    const hookA = renderHook(() => useUrlSearchState("apId", "", z.string()), {
      wrapper,
    });

    const hookB = renderHook(() => useUrlSearchState("apId", "", z.string()), {
      wrapper,
    });

    expect(hookA.result.current.value).toBe("post-42");
    expect(hookB.result.current.value).toBe("post-42");

    // removeParam on hook A resets the shared default
    act(() => {
      hookA.result.current.remove();
    });

    act(() => {
      mockSearch = "";
      vi.advanceTimersByTime(10);
      hookA.rerender();
      hookB.rerender();
    });

    // Both should see "" because they share the same provider
    expect(hookA.result.current.value).toBe("");
    expect(hookB.result.current.value).toBe("");
  });
});
