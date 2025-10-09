import { describe, expect, test } from "vitest";
import { formatOrdinal, normalizeInstance, urlStripAfterPath } from "./utils";

describe("utils", () => {
  describe("normalizeInstance", () => {
    test.each([
      ["https://lemmy.world", "https://lemmy.world"],
      ["https://lemmy.world/", "https://lemmy.world"],
      ["http://lemmy.ml", "http://lemmy.ml"],
      ["http://lemmy.ml/", "http://lemmy.ml"],
      ["piefed.social/", "https://piefed.social"],
      ["piefed.zip", "https://piefed.zip"],
    ])("%s => %s", (input, output) => {
      expect(normalizeInstance(input)).toBe(output);
    });
  });

  describe("formatOrdinal", () => {
    test.each([
      [1, "1st"],
      [2, "2nd"],
      [3, "3rd"],
      [4, "4th"],
      [5, "5th"],
      [6, "6th"],
      [7, "7th"],
      [8, "8th"],
      [9, "9th"],
      [10, "10th"],
      [20, "20th"],
      [21, "21st"],
      [22, "22nd"],
      [23, "23rd"],
      [24, "24th"],
      [30, "30th"],
      [100, "100th"],
      [121, "121st"],
    ])("%s => %s", (input, output) => {
      expect(formatOrdinal(input)).toBe(output);
    });
  });

  describe("urlStripAfterPath", () => {
    test.each([
      ["https://google.com?q=123", "https://google.com"],
      ["https://google.com/somepage/?q=123", "https://google.com/somepage/"],
      ["https://google.com/somepage?q=123", "https://google.com/somepage"],
      ["/somepage/?q=123", "/somepage/"],
      ["/somepage?q=123", "/somepage"],
    ])("%s => %s", (input, output) => {
      expect(urlStripAfterPath(input)).toBe(output);
    });
  });
});
