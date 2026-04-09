import { describe, expect, test } from "vitest";
import { z } from "zod";
import { getFirstZodIssue, zodEnumMessage } from "./zod";

describe("zodEnumMessage", () => {
  const schema = z.object({
    name: z.enum(
      ["lemmy", "piefed"],
      zodEnumMessage`Unsupported software: ${(i) => i.received}`,
    ),
  });

  test("interpolates received value for invalid enum", () => {
    const result = schema.safeParse({ name: "mastodon" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Unsupported software: mastodon",
    );
  });

  test("falls back to static string for invalid type", () => {
    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Unsupported software: ");
  });

  test("works with no interpolations", () => {
    const staticSchema = z.object({
      name: z.enum(["a", "b"], zodEnumMessage`Invalid value`),
    });
    const result = staticSchema.safeParse({ name: "c" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Invalid value");
  });

  test("works with multiple interpolations", () => {
    const multiSchema = z.object({
      name: z.enum(
        ["a", "b"],
        zodEnumMessage`Got ${(i) => i.received}, want ${(i) => i.options.join(" or ")}`,
      ),
    });
    const result = multiSchema.safeParse({ name: "c" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Got c, want a or b");
  });
});

describe("getFirstZodIssue", () => {
  test("returns first issue from a ZodError", () => {
    const result = z.string().safeParse(123);
    expect(result.success).toBe(false);
    const issue = getFirstZodIssue(result.error);
    expect(issue?.message).toBe("Expected string, received number");
  });

  test("returns first issue when there are multiple", () => {
    const result = z
      .object({ a: z.string(), b: z.string() })
      .safeParse({ a: 1, b: 2 });
    expect(result.success).toBe(false);
    const issue = getFirstZodIssue(result.error);
    expect(issue?.path).toEqual(["a"]);
  });

  test.each([
    ["a plain Error", new Error("oops")],
    ["null", null],
    ["undefined", undefined],
  ])("returns undefined for %s", (_, value) => {
    expect(getFirstZodIssue(value)).toBeUndefined();
  });
});
