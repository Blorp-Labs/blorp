import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import * as api from "@/test-utils/api";
import { useFlairsStore } from "./flairs";
import { getCachePrefixer } from "./auth";

const prefix = getCachePrefixer({ instance: "123" });

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
  });
});
