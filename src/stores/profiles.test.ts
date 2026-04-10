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
import { normalizeInstance } from "../normalize-instance";
import _ from "lodash";

const prefix = getCachePrefixer({
  instance: normalizeInstance("lemmy.world"),
  uuid: "test",
});

afterEach(() => {
  useProfilesStore.getState().reset();
});

describe("merge (cross-tab version skew protection)", () => {
  test("accepts valid persisted profiles", () => {
    const person = api.getPerson({ id: 789 });
    const key = prefix(person.apId);

    const merge = useProfilesStore.persist.getOptions().merge!;
    const result = merge(
      { profiles: { [key]: { data: person, lastUsed: Date.now() } } },
      useProfilesStore.getState(),
    );

    expect(result.profiles[key]?.data).toMatchObject(person);
  });

  test("rejects persisted profiles with invalid schema", () => {
    const merge = useProfilesStore.persist.getOptions().merge!;
    const result = merge(
      { profiles: { "some-key": { outdatedField: "old format" } } },
      useProfilesStore.getState(),
    );

    expect(result.profiles).toEqual({});
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

  test("profiles store shape", () => {
    const person = api.getPerson({ id: 789 });
    const { result } = renderHook(() => useProfilesStore());

    act(() => {
      result.current.cacheProfiles(prefix, [person]);
    });

    expect(result.current.profiles).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
