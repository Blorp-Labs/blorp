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
  migrateCreatePostStore,
} from "./create-post";
import * as api from "@/test-utils/api";

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
    communityHandle: "test@example.com",
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
    const draft = postToDraft(post, []);
    const editData = draftToEditPostData(draft);
    expect(editData.poll?.choices.map((c) => c.id)).toEqual(
      post.poll!.choices.map((c) => c.id),
    );
  });

  test("postToDraft → draftToEditPostData preserves choice text", () => {
    const { post } = api.getPost({ variant: "poll" });
    const draft = postToDraft(post, []);
    const editData = draftToEditPostData(draft);
    expect(editData.poll?.choices.map((c) => c.text)).toEqual(
      post.poll!.choices.map((c) => c.text),
    );
  });
});

describe("alt text", () => {
  const ALT = "A cat on a windowsill";

  test("postToDraft carries altText from the source post", () => {
    const { post } = api.getPost({
      variant: "image",
      post: { altText: ALT },
    });
    const draft = postToDraft(post, []);
    expect(draft.altText).toBe(ALT);
  });

  test("draftToCreatePostData outputs altText", () => {
    const draft: Draft = {
      type: "media",
      createdAt: Date.now(),
      title: "Image post",
      communityHandle: "test@example.com",
      thumbnailUrl: "https://example.com/img.jpg",
      altText: ALT,
    };
    const created = draftToCreatePostData(draft);
    expect(created.altText).toBe(ALT);
  });

  test("draftToCreatePostData omits altText when no image", () => {
    const draft: Draft = {
      type: "media",
      createdAt: Date.now(),
      title: "Image post",
      communityHandle: "test@example.com",
      apId: "https://example.com/post/1",
      altText: ALT,
    };
    const edited = draftToCreatePostData(draft);
    expect(edited.altText).toBeNull();
  });

  test.each(["text", "poll"] as const)(
    "draftToCreatePostData omits altText when %s post",
    (type) => {
      const draft: Draft = {
        type,
        createdAt: Date.now(),
        title: "Image post",
        communityHandle: "test@example.com",
        apId: "https://example.com/post/1",
        altText: ALT,
      };
      const edited = draftToCreatePostData(draft);
      expect(edited.altText).toBeNull();
    },
  );

  test("draftToEditPostData outputs altText", () => {
    const draft: Draft = {
      type: "media",
      createdAt: Date.now(),
      title: "Image post",
      communityHandle: "test@example.com",
      apId: "https://example.com/post/1",
      thumbnailUrl: "https://example.com/img.jpg",
      altText: ALT,
    };
    const edited = draftToEditPostData(draft);
    expect(edited.altText).toBe(ALT);
  });

  test("postToDraft → draftToEditPostData preserves altText", () => {
    const { post } = api.getPost({
      variant: "image",
      post: { altText: ALT },
    });
    const draft = postToDraft(post, []);
    const edited = draftToEditPostData(draft);
    expect(edited.altText).toBe(ALT);
  });

  test("postToDraft → draftToEditPostData preserves null altText", () => {
    const { post } = api.getPost({
      variant: "image",
      post: { altText: null },
    });
    const draft = postToDraft(post, []);
    const edited = draftToEditPostData(draft);
    expect(edited.altText).toBeNull();
  });

  test("draftToEditPostData omits altText when no image", () => {
    const draft: Draft = {
      type: "media",
      createdAt: Date.now(),
      title: "Image post",
      communityHandle: "test@example.com",
      apId: "https://example.com/post/1",
      altText: ALT,
    };
    const edited = draftToEditPostData(draft);
    expect(edited.altText).toBeNull();
  });

  test.each(["text", "poll"] as const)(
    "draftToEditPostData omits altText when %s post",
    (type) => {
      const draft: Draft = {
        type,
        createdAt: Date.now(),
        title: "Image post",
        communityHandle: "test@example.com",
        apId: "https://example.com/post/1",
        altText: ALT,
      };
      const edited = draftToEditPostData(draft);
      expect(edited.altText).toBeNull();
    },
  );
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
    const draft = postToDraft(post.post, []);
    const { result } = renderHook(() => useCreatePostStore());

    act(() => {
      result.current.updateDraft("draft-key", draft);
    });

    expect(result.current.drafts).toMatchSnapshot();
  });
});

describe("flairs", () => {
  test("postToDraft → draftToEditPostData preserves flairs", () => {
    const { post } = api.getPost({
      post: { apId: "https://example.com/post/1" },
    });
    const flair = api.getFlair({ title: "Round-trip Flair" });
    const draft = postToDraft(post, [flair]);
    const editData = draftToEditPostData(draft);
    expect(editData.flairs).toEqual([flair]);
  });

  test("postToDraft → draftToCreatePostData preserves flairs", () => {
    const { post } = api.getPost();
    const flair = api.getFlair({ title: "Create Flair" });
    const draft = postToDraft(post, [flair]);
    const createData = draftToCreatePostData(draft);
    expect(createData.flairs).toEqual([flair]);
  });
});

// ─── migration ──────────────────────────────────────────────────────────────

describe("migrateCreatePostStore", () => {
  test("v5 → v6: copies communitySlug to communityHandle", () => {
    const oldData = {
      drafts: {
        "draft-1": {
          type: "text",
          createdAt: Date.now(),
          communitySlug: "test@example.com",
          title: "Hello",
        },
      },
    };
    const migrated = migrateCreatePostStore(oldData);
    expect(migrated.drafts["draft-1"]?.communityHandle).toBe(
      "test@example.com",
    );
    // Keeps communitySlug for backward compat with old tabs
    expect((migrated.drafts["draft-1"] as any).communitySlug).toBe(
      "test@example.com",
    );
  });

  test("idempotent when communityHandle already present", () => {
    const oldData = {
      drafts: {
        "draft-1": {
          type: "text",
          createdAt: Date.now(),
          communityHandle: "test@example.com",
        },
      },
    };
    const migrated = migrateCreatePostStore(oldData);
    expect(migrated.drafts["draft-1"]?.communityHandle).toBe(
      "test@example.com",
    );
  });

  test("handles empty drafts", () => {
    const migrated = migrateCreatePostStore({ drafts: {} });
    expect(migrated.drafts).toEqual({});
  });

  test("handles missing drafts key", () => {
    const migrated = migrateCreatePostStore({});
    expect(migrated.drafts).toEqual({});
  });

  test("migrates multiple drafts", () => {
    const oldData = {
      drafts: {
        a: { type: "text", createdAt: 1, communitySlug: "a@x.com" },
        b: { type: "link", createdAt: 2, communitySlug: "b@y.com" },
      },
    };
    const migrated = migrateCreatePostStore(oldData);
    expect(migrated.drafts["a"]?.communityHandle).toBe("a@x.com");
    expect(migrated.drafts["b"]?.communityHandle).toBe("b@y.com");
  });
});
