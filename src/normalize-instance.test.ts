import { describe, expect, test } from "vitest";
import { normalizeInstance } from "./normalize-instance";

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
