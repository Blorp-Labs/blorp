import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import * as api from "@/test-utils/api";
import { useFlairsStore } from "./flairs";
import { getCachePrefixer } from "./auth";
import _ from "lodash";

const prefix = getCachePrefixer({ instance: "123", uuid: "test" });

describe("merge (cross-tab version skew protection)", () => {
  test("accepts valid persisted flairs", () => {
    const flair = api.getFlair({ id: 100 });
    const key = prefix(flair.id);

    const merge = useFlairsStore.persist.getOptions().merge!;
    const result = merge(
      { flairs: { [key]: { data: flair, lastUsed: Date.now() } } },
      useFlairsStore.getState(),
    );

    expect(result.flairs[key]?.data).toMatchObject(flair);
  });

  test("rejects persisted flairs with invalid schema", () => {
    const merge = useFlairsStore.persist.getOptions().merge!;
    const result = merge(
      { flairs: { "some-key": { outdatedField: "old format" } } },
      useFlairsStore.getState(),
    );

    expect(result.flairs).toEqual({});
  });
});

const FIXED_DATE = new Date("2024-01-01T00:00:00.000Z");

describe("persisted state snapshot", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("flairs store shape", () => {
    const flair = api.getFlair({ id: 100 });
    const { result } = renderHook(() => useFlairsStore());

    act(() => {
      result.current.cacheFlairs(prefix, [flair]);
    });

    expect(result.current.flairs).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
