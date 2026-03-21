import { describe, test, expect } from "vitest";
import { getDisplayUrl } from "./post-article-embed";

describe("getDisplayUrl", () => {
  test.each([
    // strips www and trailing slash
    ["https://www.example.com/", "example.com"],
    // keeps path
    [
      "https://react.dev/blog/2024/12/05/react-19",
      "react.dev/blog/2024/12/05/react-19",
    ],
    // strips trailing slash from path
    ["https://react.dev/blog/", "react.dev/blog"],
    // no path (root)
    ["https://example.com", "example.com"],
    // www stripped with path
    ["https://www.youtube.com/watch?v=abc", "youtube.com/watch"],
  ])("getDisplayUrl(%s).displayUrl == %s", (input, expected) => {
    expect(getDisplayUrl(input).displayUrl).toBe(expected);
  });

  test("returns host for article URLs", () => {
    expect(
      getDisplayUrl("https://react.dev/blog/2024/12/05/react-19").host,
    ).toBe("react.dev");
  });

  test("does not throw for invalid URLs", () => {
    expect(() => getDisplayUrl("not a url")).not.toThrow();
  });

  test("returns raw string as displayUrl for invalid URLs", () => {
    const invalid = "not a url";
    expect(getDisplayUrl(invalid).displayUrl).toBe(invalid);
  });

  test("returns raw string as displayUrl for empty string", () => {
    expect(getDisplayUrl("").displayUrl).toBe("");
  });
});
