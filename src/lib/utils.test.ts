import { describe, expect, test } from "vitest";
import { urlStripAfterPath } from "./utils";

describe("utils", () => {
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
