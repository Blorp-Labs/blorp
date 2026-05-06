import { describe, test, expect, beforeEach } from "vitest";
import { applyInsets, applyKeyboardHeight } from "./dom-writer";

describe("dom-writer", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
  });

  test("applyInsets writes 4 ion-safe-area-* vars on documentElement", () => {
    applyInsets({ top: 59, right: 4, bottom: 34, left: 8 });
    const s = document.documentElement.style;
    expect(s.getPropertyValue("--ion-safe-area-top")).toBe("59px");
    expect(s.getPropertyValue("--ion-safe-area-right")).toBe("4px");
    expect(s.getPropertyValue("--ion-safe-area-bottom")).toBe("34px");
    expect(s.getPropertyValue("--ion-safe-area-left")).toBe("8px");
  });

  test("applyKeyboardHeight writes --keyboard-height on body, 0 special-cased", () => {
    applyKeyboardHeight(300);
    expect(document.body.style.getPropertyValue("--keyboard-height")).toBe(
      "300px",
    );
    applyKeyboardHeight(0);
    expect(document.body.style.getPropertyValue("--keyboard-height")).toBe("0");
  });

  test("applyInsets does not touch body", () => {
    applyInsets({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(document.body.getAttribute("style")).toBeNull();
  });

  test("applyKeyboardHeight does not touch documentElement", () => {
    applyKeyboardHeight(100);
    expect(document.documentElement.getAttribute("style")).toBeNull();
  });
});
