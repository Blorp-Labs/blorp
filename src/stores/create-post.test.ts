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
import { useCreatePostStore, postToDraft } from "./create-post";
import * as api from "@/test-utils/api";

afterEach(() => {
  useCreatePostStore.getState().reset();
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
    const post = api.getPost({ post: { id: 123 } });
    const draft = postToDraft(post.post);
    const { result } = renderHook(() => useCreatePostStore());

    act(() => {
      result.current.updateDraft("draft-key", draft);
    });

    expect(result.current.drafts).toMatchSnapshot();
  });
});
