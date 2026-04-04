import { describe, test, expect } from "vitest";
import { getVisiblePages } from "./pagination-controls";

describe("getVisiblePages", () => {
  describe("small page counts (≤ 7): shows all pages", () => {
    test.each([
      [0, 1, [0]],
      [0, 5, [0, 1, 2, 3, 4]],
      [3, 7, [0, 1, 2, 3, 4, 5, 6]],
    ])("page %i of %i", (current, total, expected) => {
      expect(getVisiblePages(current, total)).toEqual(expected);
    });
  });

  describe("large page counts (> 7): uses ellipsis", () => {
    test.each([
      // First page: shows first 2, ellipsis, last
      [0, 8, [0, 1, "ellipsis", 7]],
      [0, 20, [0, 1, "ellipsis", 19]],
      // Last page: shows first, ellipsis, last 2
      [9, 10, [0, "ellipsis", 8, 9]],
      [19, 20, [0, "ellipsis", 18, 19]],
      // Middle: shows first, ellipsis, window of 3, ellipsis, last
      [5, 10, [0, "ellipsis", 4, 5, 6, "ellipsis", 9]],
      [10, 20, [0, "ellipsis", 9, 10, 11, "ellipsis", 19]],
      // Near start: no leading ellipsis needed
      [1, 10, [0, 1, 2, "ellipsis", 9]],
      [2, 10, [0, 1, 2, 3, "ellipsis", 9]],
      // Near end: no trailing ellipsis needed
      [8, 10, [0, "ellipsis", 7, 8, 9]],
      [7, 10, [0, "ellipsis", 6, 7, 8, 9]],
    ])("page %i of %i", (current, total, expected) => {
      expect(getVisiblePages(current, total)).toEqual(expected);
    });
  });

  test("returns empty array for 0 pages", () => {
    expect(getVisiblePages(0, 0)).toEqual([]);
  });
});
