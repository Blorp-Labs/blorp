import { renderHook, act } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { useCreatePostStore } from "./create-post";

describe("persisted state snapshot", () => {
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
