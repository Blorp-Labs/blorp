import { describe, test, expect } from "vitest";
import {
  scoreDisplayPreference,
  resolveThreshold,
  mergeCacheObject,
  mergeCacheArray,
} from "./utils";
import * as api from "@/test-utils/api";
import z from "zod";

// ─── scoreDisplayPreference ────────────────────────────────────────────────────

describe("scoreDisplayPreference — explicit app-level override", () => {
  test("'score' override always returns 'score'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayPreference("score", site)).toBe("score");
  });

  test("'upvotes' override always returns 'upvotes'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayPreference("upvotes", site)).toBe("upvotes");
  });

  test("'downvotes' override always returns 'downvotes'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayPreference("downvotes", site)).toBe("downvotes");
  });

  test("'none' override always returns 'none'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: true,
      showScores: true,
    });
    expect(scoreDisplayPreference("none", site)).toBe("none");
  });
});

describe("scoreDisplayPreference — 'account' mode derives from site flags", () => {
  // showUpvotes=true + showDownvotes=true → treated as combined score.
  test("showUpvotes=true, showDownvotes=true → 'score'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: true,
    });
    expect(scoreDisplayPreference("account", site)).toBe("score");
  });

  test("showUpvotes=true, showDownvotes=false → 'upvotes'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: false,
    });
    expect(scoreDisplayPreference("account", site)).toBe("upvotes");
  });

  test("showUpvotes=false, showDownvotes=true → 'downvotes'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: true,
    });
    expect(scoreDisplayPreference("account", site)).toBe("downvotes");
  });

  // showScores=true acts as a fallback combined score when individual flags are off.
  test("showUpvotes=false, showDownvotes=false, showScores=true → 'score'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: true,
    });
    expect(scoreDisplayPreference("account", site)).toBe("score");
  });

  test("showUpvotes=false, showDownvotes=false, showScores=false → 'none'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayPreference("account", site)).toBe("none");
  });

  // No site (logged-out guest) — all flags default to true → 'score'.
  test("no site (logged out) defaults to 'score'", () => {
    expect(scoreDisplayPreference("account", undefined)).toBe("score");
  });
});

// ─── mergeCacheObject ────────────────────────────────────────────────────────

const itemSchema = z.object({ value: z.string(), lastUsed: z.number() });
type Item = z.infer<typeof itemSchema>;
const makeItem = (value: string): Item => ({ value, lastUsed: 0 });

describe("mergeCacheObject", () => {
  test("returns empty object when both are empty", () => {
    expect(mergeCacheObject({}, {}, itemSchema)).toEqual({});
  });

  test("returns b when a is undefined", () => {
    const b = { x: makeItem("hello") };
    expect(mergeCacheObject(undefined, b, itemSchema)).toEqual(b);
  });

  test("returns b when a is empty", () => {
    const b = { x: makeItem("hello") };
    expect(mergeCacheObject({}, b, itemSchema)).toEqual(b);
  });

  test("returns a when b is undefined", () => {
    const a = { x: makeItem("hello") };
    expect(mergeCacheObject(a, undefined, itemSchema)).toEqual(a);
  });

  test("returns a when b is empty", () => {
    const a = { x: makeItem("hello") };
    expect(mergeCacheObject(a, {}, itemSchema)).toEqual(a);
  });

  test("merges both when both are valid, b wins on conflict", () => {
    const a = { x: makeItem("a-x"), y: makeItem("a-y") };
    const b = { x: makeItem("b-x"), z: makeItem("b-z") };
    const result = mergeCacheObject(a, b, itemSchema);
    expect(result["x"]).toEqual(b["x"]);
    expect(result["y"]).toEqual(a["y"]);
    expect(result["z"]).toEqual(b["z"]);
  });

  test("rejects a with invalid schema, keeps valid b", () => {
    const invalidA = { x: { wrong: "shape" } } as any;
    const validB = { y: makeItem("hello") };
    const result = mergeCacheObject(invalidA, validB, itemSchema);
    expect(result).not.toHaveProperty("x");
    expect(result).toHaveProperty("y");
  });

  test("rejects b with invalid schema, keeps valid a", () => {
    const validA = { x: makeItem("hello") };
    const invalidB = { y: { wrong: "shape" } } as any;
    const result = mergeCacheObject(validA, invalidB, itemSchema);
    expect(result).toHaveProperty("x");
    expect(result).not.toHaveProperty("y");
  });

  test("returns empty object when both have invalid schema", () => {
    const invalidA = { x: { wrong: "shape" } } as any;
    const invalidB = { y: { wrong: "shape" } } as any;
    expect(mergeCacheObject(invalidA, invalidB, itemSchema)).toEqual({});
  });

  test("works with flat string values, not just object values", () => {
    const a = { x: "hello" };
    const b = { y: "world" };
    expect(mergeCacheObject(a, b, z.string())).toEqual({
      x: "hello",
      y: "world",
    });
  });

  test("tab running old schema passes through unknown fields added by newer schema", () => {
    // Simulates two tabs on different app versions. Tab B runs a newer version
    // that added `newField` to the schema. Tab A (old version) merges tab B's
    // persisted data using the old schema — it should pass through `newField`
    // untouched so that switching back to tab B doesn't lose it.
    const versionBData = {
      key: { value: "hello", lastUsed: 0, newField: "extra" },
    };
    const result = mergeCacheObject({}, versionBData, itemSchema);
    expect(result["key"]).toMatchObject({ value: "hello", lastUsed: 0 });
    expect((result["key"] as any).newField).toBe("extra");
  });
});

// ─── mergeCacheArray ─────────────────────────────────────────────────────────

describe("mergeCacheArray", () => {
  test("returns empty array when both are empty", () => {
    expect(mergeCacheArray([], [], itemSchema)).toEqual([]);
  });

  test("returns b when a is undefined", () => {
    const b = [makeItem("hello")];
    expect(mergeCacheArray(undefined, b, itemSchema)).toEqual(b);
  });

  test("returns b when a is empty", () => {
    const b = [makeItem("hello")];
    expect(mergeCacheArray([], b, itemSchema)).toEqual(b);
  });

  test("returns a when b is undefined", () => {
    const a = [makeItem("hello")];
    expect(mergeCacheArray(a, undefined, itemSchema)).toEqual(a);
  });

  test("returns a when b is empty", () => {
    const a = [makeItem("hello")];
    expect(mergeCacheArray(a, [], itemSchema)).toEqual(a);
  });

  test("merges both when both are valid, a items first then b items", () => {
    const a = [makeItem("a-1"), makeItem("a-2")];
    const b = [makeItem("b-1")];
    const result = mergeCacheArray(a, b, itemSchema);
    expect(result).toEqual([...a, ...b]);
  });

  test("rejects a with invalid schema, keeps valid b", () => {
    const invalidA = [{ wrong: "shape" }] as any;
    const validB = [makeItem("hello")];
    const result = mergeCacheArray(invalidA, validB, itemSchema);
    expect(result).toEqual(validB);
  });

  test("rejects b with invalid schema, keeps valid a", () => {
    const validA = [makeItem("hello")];
    const invalidB = [{ wrong: "shape" }] as any;
    const result = mergeCacheArray(validA, invalidB, itemSchema);
    expect(result).toEqual(validA);
  });

  test("returns empty array when both have invalid schema", () => {
    const invalidA = [{ wrong: "shape" }] as any;
    const invalidB = [{ wrong: "shape" }] as any;
    expect(mergeCacheArray(invalidA, invalidB, itemSchema)).toEqual([]);
  });

  test("works with flat string values, not just object values", () => {
    const a = ["hello"];
    const b = ["world"];
    expect(mergeCacheArray(a, b, z.string())).toEqual(["hello", "world"]);
  });

  test("tab running old schema passes through unknown fields added by newer schema", () => {
    // Simulates two tabs on different app versions. Tab B runs a newer version
    // that added `newField` to the schema. Tab A (old version) merges tab B's
    // persisted data using the old schema — it should pass through `newField`
    // untouched so that switching back to tab B doesn't lose it.
    const versionBData = [{ value: "hello", lastUsed: 0, newField: "extra" }];
    const result = mergeCacheArray(versionBData, [], itemSchema);
    expect(result[0]).toMatchObject({ value: "hello", lastUsed: 0 });
    expect((result[0] as any).newField).toBe("extra");
  });
});

// ─── resolveThreshold ────────────────────────────────────────────────────────

describe("resolveThreshold", () => {
  test("'account' mode returns server threshold", () => {
    expect(resolveThreshold("account", -15)).toBe(-15);
  });

  test("'account' mode returns null when site has no threshold", () => {
    expect(resolveThreshold("account", undefined)).toBe(null);
  });

  test("explicit numeric setting ignores server value", () => {
    expect(resolveThreshold(-5, -20)).toBe(-5);
  });
});
