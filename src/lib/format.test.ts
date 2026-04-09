import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { abbriviateNumber, getPreferedTimeFormat } from "./format";

describe("abbriviateNumber", () => {
  test.each([
    [184, "184"],
    [1000, "1k"],
    [2340, "2.3k"],
    [29481, "29.4k"],
    [1000000, "1m"],
    [2842183, "2.8m"],
  ])("abbriviateNumber(%s) == %s", (input, abr) => {
    expect(abbriviateNumber(input)).toBe(abr);
  });
});

describe("getPreferedTimeFormat", () => {
  beforeEach(() => {
    getPreferedTimeFormat.cache.clear!();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockHourCycle(
    hourCycle: Intl.ResolvedDateTimeFormatOptions["hourCycle"],
  ) {
    return vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () =>
            ({ hourCycle }) satisfies Pick<
              Intl.ResolvedDateTimeFormatOptions,
              "hourCycle"
            >,
        }) as Intl.DateTimeFormat,
    );
  }

  test.each(["h23", "h24"] as const)(
    "returns HH:mm for %s hour cycle",
    (cycle) => {
      mockHourCycle(cycle);
      expect(getPreferedTimeFormat()).toBe("HH:mm");
    },
  );

  test.each(["h11", "h12"] as const)(
    "returns LT for %s hour cycle",
    (cycle) => {
      mockHourCycle(cycle);
      expect(getPreferedTimeFormat()).toBe("LT");
    },
  );
});
