import { describe, test, expect } from "vitest";
import { createCoordinator } from "./coordinator";

describe("coordinator", () => {
  test("starts with zero insets", () => {
    const c = createCoordinator();
    expect(c.getEffectiveInsets()).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(c.isKeyboardShowing()).toBe(false);
  });

  test("setRawInsets is reflected in effective insets", () => {
    const c = createCoordinator();
    c.setRawInsets({ top: 59, right: 0, bottom: 34, left: 0 });
    expect(c.getEffectiveInsets()).toEqual({
      top: 59,
      right: 0,
      bottom: 34,
      left: 0,
    });
  });

  test("keyboard showing forces bottom=0", () => {
    const c = createCoordinator();
    c.setRawInsets({ top: 59, right: 0, bottom: 34, left: 0 });
    c.setKeyboardShowing(true);
    expect(c.getEffectiveInsets()).toEqual({
      top: 59,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  test("clearing keyboard restores raw bottom", () => {
    const c = createCoordinator();
    c.setRawInsets({ top: 59, right: 0, bottom: 34, left: 0 });
    c.setKeyboardShowing(true);
    c.setKeyboardShowing(false);
    expect(c.getEffectiveInsets().bottom).toBe(34);
  });

  test("raw inset updates while keyboard showing keep bottom suppressed", () => {
    const c = createCoordinator();
    c.setKeyboardShowing(true);
    c.setRawInsets({ top: 30, right: 0, bottom: 50, left: 0 });
    expect(c.getEffectiveInsets().bottom).toBe(0);
  });
});
