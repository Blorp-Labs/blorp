import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import * as React from "react";

const isAndroidMock = vi.fn(() => true);
vi.mock("../lib/device", () => ({
  isAndroid: () => isAndroidMock(),
}));

const refreshSafeAreaMock = vi.fn();
vi.mock("../lib/safe-area/register", () => ({
  refreshSafeArea: () => refreshSafeAreaMock(),
}));

import { useFullscreenVideoContainer } from "./use-fullscreen-video-container";

function Harness({ id }: { id: string }) {
  const ref = useFullscreenVideoContainer<HTMLDivElement>();
  return <div ref={ref} data-testid={id} />;
}

function setFullscreenElement(el: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => el,
  });
}

describe("useFullscreenVideoContainer", () => {
  beforeEach(() => {
    isAndroidMock.mockReturnValue(true);
    refreshSafeAreaMock.mockReset();
    setFullscreenElement(null);
    history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    setFullscreenElement(null);
  });

  test("non-Android is a no-op", () => {
    isAndroidMock.mockReturnValue(false);
    const { getByTestId } = render(<Harness id="a" />);
    const el = getByTestId("a");
    setFullscreenElement(el);
    el.dispatchEvent(new Event("fullscreenchange"));
    setFullscreenElement(null);
    el.dispatchEvent(new Event("fullscreenchange"));
    expect(refreshSafeAreaMock).not.toHaveBeenCalled();
  });

  test("calls refreshSafeArea on fullscreen exit", () => {
    const { getByTestId } = render(<Harness id="a" />);
    const el = getByTestId("a");
    setFullscreenElement(el);
    act(() => el.dispatchEvent(new Event("fullscreenchange")));
    setFullscreenElement(null);
    act(() => el.dispatchEvent(new Event("fullscreenchange")));
    expect(refreshSafeAreaMock).toHaveBeenCalledTimes(1);
  });

  test("does not refresh when entering fullscreen", () => {
    const { getByTestId } = render(<Harness id="a" />);
    const el = getByTestId("a");
    setFullscreenElement(el);
    act(() => el.dispatchEvent(new Event("fullscreenchange")));
    expect(refreshSafeAreaMock).not.toHaveBeenCalled();
  });

  test("history.back is only called when state.videoFullscreen is set", () => {
    const backSpy = vi.spyOn(history, "back").mockImplementation(() => {});
    const { getByTestId, rerender } = render(<Harness id="a" />);
    const el = getByTestId("a");

    // Without flag: no history.back
    setFullscreenElement(el);
    act(() => el.dispatchEvent(new Event("fullscreenchange")));
    setFullscreenElement(null);
    act(() => el.dispatchEvent(new Event("fullscreenchange")));
    expect(backSpy).not.toHaveBeenCalled();
    expect(refreshSafeAreaMock).toHaveBeenCalledTimes(1);

    // Re-mount with flag set
    rerender(<></>);
    history.replaceState({ videoFullscreen: true }, "", "/");
    rerender(<Harness id="b" />);
    const el2 = getByTestId("b");
    setFullscreenElement(el2);
    act(() => el2.dispatchEvent(new Event("fullscreenchange")));
    setFullscreenElement(null);
    act(() => el2.dispatchEvent(new Event("fullscreenchange")));
    expect(backSpy).toHaveBeenCalledTimes(1);

    backSpy.mockRestore();
  });

  test("removes listener on unmount", () => {
    const { getByTestId, unmount } = render(<Harness id="a" />);
    const el = getByTestId("a");
    unmount();
    setFullscreenElement(el);
    el.dispatchEvent(new Event("fullscreenchange"));
    setFullscreenElement(null);
    el.dispatchEvent(new Event("fullscreenchange"));
    expect(refreshSafeAreaMock).not.toHaveBeenCalled();
  });
});
