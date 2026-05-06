import { describe, test, expect, beforeEach, vi } from "vitest";

const isIosMock = vi.fn(() => false);
vi.mock("../device", () => ({
  isIos: () => isIosMock(),
}));

vi.mock("capacitor-plugin-safe-area", () => ({
  SafeArea: {
    getSafeAreaInsets: vi.fn(),
    addListener: vi.fn(),
  },
}));

import { createWebEnvSource, createManualSource } from "./sources";

describe("createWebEnvSource", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    isIosMock.mockReturnValue(false);
  });

  test("creates a hidden probe div with env() padding on first read", async () => {
    const src = createWebEnvSource();
    await src.get();
    const probe = document.body.querySelector(
      'div[aria-hidden="true"]',
    ) as HTMLDivElement | null;
    // jsdom drops unrecognized env() values from cssText; real-browser
    // resolution is covered by e2e/safe-area.spec.ts.
    expect(probe).not.toBeNull();
    expect(probe!.style.visibility).toBe("hidden");
    expect(probe!.style.position).toBe("fixed");
    expect(probe!.style.pointerEvents).toBe("none");
  });

  test("get() returns finite numbers for all four sides", async () => {
    const src = createWebEnvSource();
    const insets = await src.get();
    expect(Number.isFinite(insets.top)).toBe(true);
    expect(Number.isFinite(insets.right)).toBe(true);
    expect(Number.isFinite(insets.bottom)).toBe(true);
    expect(Number.isFinite(insets.left)).toBe(true);
  });

  test("subscribe re-reads on window resize", async () => {
    const src = createWebEnvSource();
    const cb = vi.fn();
    const unsub = src.subscribe(cb);
    window.dispatchEvent(new Event("resize"));
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    window.dispatchEvent(new Event("resize"));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("non-iOS does not subscribe to visualViewport events", () => {
    isIosMock.mockReturnValue(false);
    const vv = window.visualViewport;
    const addSpy = vv ? vi.spyOn(vv, "addEventListener") : null;
    const src = createWebEnvSource();
    src.subscribe(() => {});
    if (addSpy) {
      const events = addSpy.mock.calls.map((c) => c[0]);
      expect(events).not.toContain("resize");
      expect(events).not.toContain("scroll");
    }
  });

  test("iOS subscribes to visualViewport resize and scroll", () => {
    isIosMock.mockReturnValue(true);
    if (!window.visualViewport) {
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: {
          height: 800,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      });
    }
    const vv = window.visualViewport!;
    const addSpy = vi.spyOn(vv, "addEventListener");
    const src = createWebEnvSource();
    const unsub = src.subscribe(() => {});
    const events = addSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("resize");
    expect(events).toContain("scroll");
    unsub();
  });
});

describe("createManualSource", () => {
  test("get returns initial insets", async () => {
    const src = createManualSource({ top: 10, right: 0, bottom: 20, left: 0 });
    expect(await src.get()).toEqual({
      top: 10,
      right: 0,
      bottom: 20,
      left: 0,
    });
  });

  test("set updates and notifies subscribers", () => {
    const src = createManualSource();
    const cb = vi.fn();
    src.subscribe(cb);
    src.set({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(cb).toHaveBeenCalledWith({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  test("unsubscribe stops notifications", () => {
    const src = createManualSource();
    const cb = vi.fn();
    const unsub = src.subscribe(cb);
    unsub();
    src.set({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(cb).not.toHaveBeenCalled();
  });
});
