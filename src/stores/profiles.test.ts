import { renderHook, act } from "@testing-library/react";
import {
  describe,
  test,
  expect,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import * as api from "@/test-utils/api";
import { useProfilesStore } from "./profiles";
import { getCachePrefixer } from "./auth";

const prefix = getCachePrefixer({ instance: "123" });

afterEach(() => {
  useProfilesStore.getState().reset();
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

  test("profiles store shape", () => {
    const person = api.getPerson({ id: 789 });
    const { result } = renderHook(() => useProfilesStore());

    act(() => {
      result.current.cacheProfiles(prefix, [person]);
    });

    expect(result.current.profiles).toMatchSnapshot();
  });
});
