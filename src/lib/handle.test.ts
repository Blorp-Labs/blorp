import { describe, expect, test } from "vitest";
import { handleSchema, createHandle, parseHandle } from "./handle";

describe("handleSchema", () => {
  test("accepts standard handles", () => {
    expect(handleSchema.safeParse("username@instance.com").success).toBe(true);
    expect(handleSchema.safeParse("my-community@lemmy.ml").success).toBe(true);
    expect(
      handleSchema.safeParse("user_name@some.instance.social").success,
    ).toBe(true);
  });

  test("accepts handles with dots in the name (fediverse Misskey/Firefish usernames)", () => {
    expect(handleSchema.safeParse("user.name@instance.com").success).toBe(true);
    expect(handleSchema.safeParse("first.last@example.org").success).toBe(true);
    expect(
      handleSchema.safeParse("multi.community.feed@lemmy.ml").success,
    ).toBe(true);
  });

  test("rejects handles without @", () => {
    expect(handleSchema.safeParse("username").success).toBe(false);
  });

  test("rejects handles with missing name or host", () => {
    expect(handleSchema.safeParse("@instance.com").success).toBe(false);
    expect(handleSchema.safeParse("username@").success).toBe(false);
  });

  test("rejects hosts without a valid TLD", () => {
    expect(handleSchema.safeParse("username@localhost").success).toBe(false);
  });
});

describe("createHandle", () => {
  test.each([
    ["https://lemmy.world/c/brexit", "brexit", "brexit@lemmy.world"],
    [
      "https://lemmy.world/c/finance_greece",
      "finance_greece",
      "finance_greece@lemmy.world",
    ],
    ["https://lemmy.world/c/economy", "economy", "economy@lemmy.world"],
    ["https://midwest.social/c/memes", "memes", "memes@midwest.social"],
    [
      "https://lemmy.blahaj.zone/c/onehundredninetysix",
      "onehundredninetysix",
      "onehundredninetysix@lemmy.blahaj.zone",
    ],
    ["https://lemdro.id/c/meta", "meta", "meta@lemdro.id"],
  ])('createHandle("%s") == %s', (apId, name, handle) => {
    expect(createHandle({ apId, name })).toBe(handle);
    expect(handleSchema.safeParse(handle).success).toBe(true);
  });
});

describe("parseHandle", () => {
  test.each([
    ["brexit@lemmy.world", "brexit", "lemmy.world"] as const,
    ["finance_greece@lemmy.world", "finance_greece", "lemmy.world"] as const,
    ["memes@midwest.social", "memes", "midwest.social"] as const,
    [
      "onehundredninetysix@lemmy.blahaj.zone",
      "onehundredninetysix",
      "lemmy.blahaj.zone",
    ] as const,
  ])('parseHandle("%s")', (handle, name, host) => {
    expect(parseHandle(handle)).toEqual({ name, host });
  });

  test("undefined input returns undefined fields", () => {
    expect(parseHandle(undefined)).toEqual({
      name: undefined,
      host: undefined,
    });
  });
});
