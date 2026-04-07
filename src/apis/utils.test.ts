import { describe, test, expect } from "vitest";
import { createSlug, parseSlug } from "../apis/utils";

describe("createSlug", () => {
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
  ])('createSlug("%s").slug == %s', (apId, name, slug) => {
    expect(createSlug({ apId, name })?.slug).toBe(slug);
  });

  //test.each([
  //  // ["https://lemmy.world/u/ajetsf"],
  //  ["https://google.com"],
  //  ["https://youtube.com"],
  //  ["https://www.youtube.com"],
  //])('createSlug("%s").slug == ""', (actor_id) => {
  //  expect(createSlug({ actor_id })?.slug).toBe(undefined);
  //});
});

describe("parseSlug", () => {
  test.each([
    ["brexit@lemmy.world", "brexit", "lemmy.world"],
    ["finance_greece@lemmy.world", "finance_greece", "lemmy.world"],
    ["memes@midwest.social", "memes", "midwest.social"],
    [
      "onehundredninetysix@lemmy.blahaj.zone",
      "onehundredninetysix",
      "lemmy.blahaj.zone",
    ],
  ])('parseSlug("%s")', (slug, name, host) => {
    expect(parseSlug(slug)).toEqual({ name, host });
  });

  test("undefined input returns undefined fields", () => {
    expect(parseSlug(undefined)).toEqual({ name: undefined, host: undefined });
  });
});
