import { describe, test, expect } from "vitest";
import { createHandle, parseHandle } from "../apis/utils";

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
  ])('createHandle("%s") == %s', (apId, name, slug) => {
    expect(createHandle({ apId, name })).toBe(slug);
  });

  //test.each([
  //  // ["https://lemmy.world/u/ajetsf"],
  //  ["https://google.com"],
  //  ["https://youtube.com"],
  //  ["https://www.youtube.com"],
  //])('createHandle("%s").handle == ""', (actor_id) => {
  //  expect(createHandle({ actor_id })?.handle).toBe(undefined);
  //});
});

describe("parseHandle", () => {
  test.each([
    ["brexit@lemmy.world", "brexit", "lemmy.world"],
    ["finance_greece@lemmy.world", "finance_greece", "lemmy.world"],
    ["memes@midwest.social", "memes", "midwest.social"],
    [
      "onehundredninetysix@lemmy.blahaj.zone",
      "onehundredninetysix",
      "lemmy.blahaj.zone",
    ],
  ])('parseHandle("%s")', (slug, name, host) => {
    expect(parseHandle(slug)).toEqual({ name, host });
  });

  test("undefined input returns undefined fields", () => {
    expect(parseHandle(undefined)).toEqual({
      name: undefined,
      host: undefined,
    });
  });
});
