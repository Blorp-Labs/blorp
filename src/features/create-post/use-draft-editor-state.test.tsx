import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useCreatePostStore } from "../../stores/create-post";
import { RouteSearchParamProvider } from "../../hooks/use-url-search-state";
import { useDraftEditorState } from "./use-draft-editor-state";

// ── Mocks ────────────────────────────────────────────────────────────────────

const FALLBACK_UUID = "00000000-0000-0000-0000-000000000001";

vi.mock("uuid", () => ({
  v4: () => "00000000-0000-0000-0000-000000000001",
}));

let mockPathname = "/create_post";
let mockSearch = "";

vi.mock("@/src/hooks/use-pathname", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("react-router-dom", () => ({
  useHistory: () => ({ replace: vi.fn(), push: vi.fn() }),
  useLocation: () => ({
    pathname: mockPathname,
    search: mockSearch,
    hash: "",
    state: null,
  }),
}));

vi.mock("@ionic/react", () => ({
  useIonAlert: () => [vi.fn()],
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockPathname = "/create_post";
  mockSearch = "";
  useCreatePostStore.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const DRAFT_A = "aaaaaaaa-0000-0000-0000-000000000001";
const DRAFT_B = "bbbbbbbb-0000-0000-0000-000000000001";

function seedDraft(id: string, createdAt: number, title?: string) {
  useCreatePostStore
    .getState()
    .updateDraft(id, { type: "text", createdAt, title });
}

function wrap() {
  return ({ children }: { children: React.ReactNode }) => (
    <RouteSearchParamProvider>{children}</RouteSearchParamProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useDraftEditorState — no drafts, no URL params", () => {
  test("draftId is the fallback UUID", () => {
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draftId).toBe(FALLBACK_UUID);
  });

  test("draft is a fresh empty draft", () => {
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draft.title).toBeUndefined();
    expect(result.current.draft.type).toBe("text");
  });

  test("nothing is persisted to the store on mount", () => {
    renderHook(() => useDraftEditorState(), { wrapper: wrap() });
    expect(useCreatePostStore.getState().drafts[FALLBACK_UUID]).toBeUndefined();
  });

  test("patchDraft persists the draft to the store", () => {
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    act(() => {
      result.current.patchDraft({ title: "Hello" });
    });
    expect(useCreatePostStore.getState().drafts[FALLBACK_UUID]?.title).toBe(
      "Hello",
    );
  });
});

describe("useDraftEditorState — existing drafts, no URL params", () => {
  test("selects the most recent draft", () => {
    seedDraft(DRAFT_A, 1000);
    seedDraft(DRAFT_B, 2000);
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draftId).toBe(DRAFT_B);
  });

  test("draft content matches the most recent draft", () => {
    seedDraft(DRAFT_A, 1000, "Older");
    seedDraft(DRAFT_B, 2000, "Newer");
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draft.title).toBe("Newer");
  });
});

describe("useDraftEditorState — URL id param", () => {
  test("selects the draft matching the id param", () => {
    seedDraft(DRAFT_A, 1000, "Draft A");
    seedDraft(DRAFT_B, 2000, "Draft B");
    mockSearch = `?id=${DRAFT_A}`;
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draftId).toBe(DRAFT_A);
    expect(result.current.draft.title).toBe("Draft A");
  });
});

describe("useDraftEditorState — URL content params (title/url/body/nsfw)", () => {
  test("uses fallback UUID, not an existing draft", () => {
    seedDraft(DRAFT_A, 1000, "Existing");
    mockSearch = "?title=From+URL";
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draftId).toBe(FALLBACK_UUID);
  });

  test("draft reflects the URL params", () => {
    mockSearch = "?title=Hello&url=https%3A%2F%2Fexample.com";
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draft.title).toBe("Hello");
    expect(result.current.draft.url).toBe("https://example.com");
    expect(result.current.draft.type).toBe("link");
  });

  test("nsfw param sets nsfw flag", () => {
    mockSearch = "?nsfw=1";
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    expect(result.current.draft.nsfw).toBe(true);
  });

  test("nothing is persisted to the store on mount", () => {
    mockSearch = "?title=From+URL";
    renderHook(() => useDraftEditorState(), { wrapper: wrap() });
    expect(useCreatePostStore.getState().drafts[FALLBACK_UUID]).toBeUndefined();
  });

  test("patchDraft merges URL params into the persisted draft", () => {
    mockSearch = "?title=From+URL";
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });
    act(() => {
      result.current.patchDraft({
        communityHandle: "mycommunity@example.com",
      });
    });
    const saved = useCreatePostStore.getState().drafts[FALLBACK_UUID];
    expect(saved?.title).toBe("From URL");
    expect(saved?.communityHandle).toBe("mycommunity@example.com");
  });

  test("after first edit, draft is read from store not URL params", () => {
    mockSearch = "?title=From+URL";
    const { result } = renderHook(() => useDraftEditorState(), {
      wrapper: wrap(),
    });

    // Before any edit, draft comes from URL params
    expect(result.current.draft.title).toBe("From URL");

    act(() => {
      result.current.patchDraft({ title: "Edited" });
    });

    // After edit, draft comes from store — store value wins over URL params
    expect(result.current.draft.title).toBe("Edited");
    expect(result.current.draft.communityHandle).toBeUndefined();
  });
});
