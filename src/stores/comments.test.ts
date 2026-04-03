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
import { useCommentsStore } from "./comments";
import { getCachePrefixer } from "./auth";
import _ from "lodash";

const prefix = getCachePrefixer({ instance: "123", uuid: "test" });

afterEach(() => {
  useCommentsStore.getState().reset();
});

describe("merge (cross-tab version skew protection)", () => {
  test("accepts valid persisted comments", () => {
    const comment = api.getComment({ id: 456 });
    const key = prefix(comment.path);

    const merge = useCommentsStore.persist.getOptions().merge!;
    const result = merge(
      { comments: { [key]: { data: comment, lastUsed: Date.now() } } },
      useCommentsStore.getState(),
    );

    expect(result.comments[key]?.data).toMatchObject(comment);
  });

  test("rejects persisted comments with invalid schema", () => {
    const merge = useCommentsStore.persist.getOptions().merge!;
    const result = merge(
      { comments: { "some-key": { outdatedField: "old format" } } },
      useCommentsStore.getState(),
    );

    expect(result.comments).toEqual({});
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

  test("comments store shape", () => {
    const comment = api.getComment({ id: 456 });
    const { result } = renderHook(() => useCommentsStore());

    act(() => {
      result.current.cacheComments(prefix, [comment]);
    });

    expect(result.current.comments).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
