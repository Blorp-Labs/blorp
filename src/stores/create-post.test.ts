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
import { useCreatePostStore } from "./create-post";

afterEach(() => {
  const { result } = renderHook(() => useCreatePostStore());
  act(() => {
    result.current.reset();
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

  test("create post store shape", () => {
    const { result } = renderHook(() => useCreatePostStore());

    act(() => {
      result.current.updateDraft("draft-key", {
        title: "Test Post",
        communitySlug: "test@example.com",
        createdAt: 1704067200000,
      });
    });

    expect(result.current.drafts).toMatchSnapshot();
  });
});
