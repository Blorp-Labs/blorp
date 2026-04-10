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
import {
  useCreatePostStore,
  postToDraft,
  draftToCreatePostData,
  draftToEditPostData,
  isEmptyDraft,
  Draft,
} from "./create-post";
import * as api from "@/test-utils/api";
import { handleSchema } from "../apis/api-blueprint";

afterEach(() => {
  useCreatePostStore.getState().reset();
});

const FIXED_DATE = new Date("2024-01-01T00:00:00.000Z");

describe("isEmptyDraft", () => {
  const basePoll: Draft["poll"] = {
    endAmount: 7,
    endUnit: "days",
    mode: "single",
    localOnly: false,
    choices: [],
  };

  test("poll with no poll field is empty", () => {
    const draft: Draft = {
      type: "poll",
      createdAt: Date.now(),
    };
    expect(isEmptyDraft(draft)).toBe(true);
  });

  test("poll with all empty choices is empty", () => {
    const draft: Draft = {
      type: "poll",
      createdAt: Date.now(),
      poll: {
        ...basePoll,
        choices: [
          { id: 0, text: "", sortOrder: 0 },
          { id: 0, text: "   ", sortOrder: 1 },
        ],
      },
    };
    expect(isEmptyDraft(draft)).toBe(true);
  });

  test("poll with at least one non-empty choice is not empty", () => {
    const draft: Draft = {
      type: "poll",
      createdAt: Date.now(),
      poll: {
        ...basePoll,
        choices: [
          { id: 0, text: "Option A", sortOrder: 0 },
          { id: 0, text: "", sortOrder: 1 },
        ],
      },
    };
    expect(isEmptyDraft(draft)).toBe(false);
  });
});

describe("empty choice filtering", () => {
  const baseDraft: Draft = {
    type: "poll",
    createdAt: Date.now(),
    title: "Test poll",
    communityHandle: handleSchema.parse("test@example.com"),
    apId: "https://example.com/post/1",
    poll: {
      endAmount: 7,
      endUnit: "days",
      mode: "single",
      localOnly: false,
      choices: [
        { id: 1, text: "Option A", sortOrder: 0 },
        { id: 2, text: "Option B", sortOrder: 1 },
        { id: 0, text: "", sortOrder: 2 },
        { id: 0, text: "   ", sortOrder: 3 },
      ],
    },
  };

  test("draftToCreatePostData filters empty choices", () => {
    const result = draftToCreatePostData(baseDraft);
    expect(result.poll?.choices.map((c) => c.text)).toEqual([
      "Option A",
      "Option B",
    ]);
  });

  test("draftToEditPostData filters empty choices", () => {
    const result = draftToEditPostData(baseDraft);
    expect(result.poll?.choices.map((c) => c.text)).toEqual([
      "Option A",
      "Option B",
    ]);
  });
});

describe("poll round trip", () => {
  test("postToDraft → draftToEditPostData preserves choice ids", () => {
    const { post } = api.getPost({ variant: "poll" });
    const draft = postToDraft(post);
    const editData = draftToEditPostData(draft);
    expect(editData.poll?.choices.map((c) => c.id)).toEqual(
      post.poll!.choices.map((c) => c.id),
    );
  });

  test("postToDraft → draftToEditPostData preserves choice text", () => {
    const { post } = api.getPost({ variant: "poll" });
    const draft = postToDraft(post);
    const editData = draftToEditPostData(draft);
    expect(editData.poll?.choices.map((c) => c.text)).toEqual(
      post.poll!.choices.map((c) => c.text),
    );
  });
});

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
