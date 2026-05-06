import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

const keyboardListeners = new Map<string, (info: any) => void>();
const safeAreaListeners = new Set<(r: { insets: any }) => void>();

vi.mock("@capacitor/keyboard", () => ({
  Keyboard: {
    addListener: (event: string, cb: any) => {
      keyboardListeners.set(event, cb);
      return Promise.resolve({ remove: () => keyboardListeners.delete(event) });
    },
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setOverlaysWebView: vi.fn(() => Promise.resolve()),
  },
}));

const safeAreaGetMock = vi.fn();
vi.mock("capacitor-plugin-safe-area", () => ({
  SafeArea: {
    getSafeAreaInsets: () => safeAreaGetMock(),
    addListener: (_event: string, cb: any) => {
      safeAreaListeners.add(cb);
      return Promise.resolve({
        remove: () => safeAreaListeners.delete(cb),
      });
    },
  },
}));

const isNativeMock = vi.fn(() => true);
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNativeMock() },
}));

const isAndroidMock = vi.fn(() => false);
vi.mock("../device", () => ({
  isAndroid: () => isAndroidMock(),
}));

import { registerSafeArea, refreshSafeArea } from "./register";

const flush = () => new Promise((r) => setTimeout(r, 0));

let cleanup: (() => void) | undefined;

describe("registerSafeArea", () => {
  beforeEach(() => {
    keyboardListeners.clear();
    safeAreaListeners.clear();
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
    safeAreaGetMock.mockReset();
    isNativeMock.mockReturnValue(true);
    isAndroidMock.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.useRealTimers();
  });

  test("web path zeros insets and registers no listeners", async () => {
    isNativeMock.mockReturnValue(false);
    cleanup = registerSafeArea();
    expect(
      document.documentElement.style.getPropertyValue("--ion-safe-area-top"),
    ).toBe("0px");
    expect(keyboardListeners.size).toBe(0);
    expect(safeAreaListeners.size).toBe(0);
  });

  test("native path pulls insets, subscribes, registers iOS keyboard listeners", async () => {
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
    });
    cleanup = registerSafeArea();
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue("--ion-safe-area-top"),
      ).toBe("59px"),
    );
    expect(safeAreaListeners.size).toBe(1);
    expect([...keyboardListeners.keys()].sort()).toEqual([
      "keyboardDidHide",
      "keyboardDidShow",
      "keyboardWillHide",
      "keyboardWillShow",
    ]);
  });

  test("android path skips keyboard listeners", () => {
    isAndroidMock.mockReturnValue(true);
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 24, right: 0, bottom: 16, left: 0 },
    });
    cleanup = registerSafeArea();
    expect(keyboardListeners.size).toBe(0);
  });

  test("safeAreaChanged subscription updates DOM", async () => {
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    cleanup = registerSafeArea();
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue("--ion-safe-area-top"),
      ).toBe("0px"),
    );
    for (const cb of safeAreaListeners) {
      cb({ insets: { top: 100, right: 0, bottom: 0, left: 0 } });
    }
    expect(
      document.documentElement.style.getPropertyValue("--ion-safe-area-top"),
    ).toBe("100px");
  });

  test("keyboardWillShow forces bottom=0 and writes keyboard-height", async () => {
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
    });
    cleanup = registerSafeArea();
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          "--ion-safe-area-bottom",
        ),
      ).toBe("34px"),
    );
    keyboardListeners.get("keyboardWillShow")!({ keyboardHeight: 300 });
    await flush();
    expect(document.body.style.getPropertyValue("--keyboard-height")).toBe(
      "300px",
    );
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          "--ion-safe-area-bottom",
        ),
      ).toBe("0px"),
    );
  });

  test("keyboardDidHide clears keyboard-height and restores bottom", async () => {
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
    });
    cleanup = registerSafeArea();
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          "--ion-safe-area-bottom",
        ),
      ).toBe("34px"),
    );
    keyboardListeners.get("keyboardWillShow")!({ keyboardHeight: 300 });
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          "--ion-safe-area-bottom",
        ),
      ).toBe("0px"),
    );
    keyboardListeners.get("keyboardDidHide")!({});
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          "--ion-safe-area-bottom",
        ),
      ).toBe("34px"),
    );
    expect(document.body.style.getPropertyValue("--keyboard-height")).toBe("0");
  });

  test("visibilitychange visible debounces a refetch and resets keyboard state", async () => {
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 59, right: 0, bottom: 34, left: 0 },
    });
    cleanup = registerSafeArea();
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue("--ion-safe-area-top"),
      ).toBe("59px"),
    );
    keyboardListeners.get("keyboardWillShow")!({ keyboardHeight: 300 });
    await flush();
    vi.useFakeTimers();
    safeAreaGetMock.mockClear();

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(document.body.style.getPropertyValue("--keyboard-height")).toBe("0");
    expect(safeAreaGetMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(safeAreaGetMock).toHaveBeenCalledTimes(1);
  });

  test("refreshSafeArea triggers a non-debounced refetch", async () => {
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    cleanup = registerSafeArea();
    await flush();
    safeAreaGetMock.mockClear();
    safeAreaGetMock.mockResolvedValue({
      insets: { top: 80, right: 0, bottom: 0, left: 0 },
    });
    refreshSafeArea();
    await vi.waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue("--ion-safe-area-top"),
      ).toBe("80px"),
    );
  });
});
