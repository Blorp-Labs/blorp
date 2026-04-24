import { describe, expect, test } from "vitest";
import { buildCommentTree, CommentTree, shouldShowMore } from "./comment-tree";

const postApId = "https://blorpblorp.xyz/p/123456";

describe("buildCommentTree", () => {
  describe("deduplication", () => {
    test.todo(
      "keeps the first occurrence when duplicate comment ids are present",
    );
  });

  describe("path filtering", () => {
    test.todo(
      "returns only the requested subtree when commentPath is provided",
    );
    test.todo("keeps comments exactly at the requested subtree root");
    test.todo("ignores comments outside the requested subtree");
  });

  describe("tree construction", () => {
    test.todo("builds nested nodes from comment paths");
    test.todo("preserves insertion order through sort values");
    test.todo(
      "creates a top-level placeholder node when the root comment is missing",
    );
    test.todo(
      "creates intermediate placeholder nodes when middle comments are missing",
    );
    test.todo(
      "hydrates a top-level placeholder when the real comment later arrives",
    );
    test.todo(
      "hydrates an intermediate placeholder when the real comment later arrives",
    );
    test.todo(
      "does not overwrite an existing real ancestor when later descendants reuse it",
    );
  });

  describe("max depth", () => {
    test.todo("omits comments deeper than the configured maxDepth");
    test.todo(
      "keeps imediateChildren > 0 on the last visible node when maxDepth truncates deeper comments",
    );
  });

  describe("pruning by page cursor", () => {
    test.todo(
      "marks a parent pruned when a direct child has a different pageCursor",
    );
    test.todo("removes direct children loaded from a different page");
    test.todo("removes descendants of a pruned branch");
    test.todo("does not prune a child when it shares the parent's pageCursor");
    test.todo("does not prune top-level comments regardless of pageCursor");
    test.todo(
      "does not prune placeholder nodes that are later hydrated by a real comment",
    );
    test.todo("compares pageCursor against the immediate parent, not the root");
    test.todo(
      "clips a cross-page branch when the new comment does not hydrate an existing placeholder",
    );
  });

  describe("immediate children counting", () => {
    test.todo("counts direct visible children when the full branch is present");
    test.todo(
      "accounts for missing direct children when descendants are present",
    );
    test.todo(
      "retains missing-child count after pruning removes direct children",
    );
    test.todo(
      "retains missing-child count when maxDepth truncates descendants",
    );
  });
});

describe("shouldShowMore", () => {
  test("returns true when a node is pruned", () => {
    const tree = buildCommentTree([
      { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 1 },
    ]);

    expect(shouldShowMore(tree[1234] as CommentTree)).toBe(true);
  });

  test("returns true when maxDepth truncates direct children from the visible tree", () => {
    const tree = buildCommentTree(
      [
        { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
        {
          path: "0.1234.5678",
          childCount: 0,
          postApId,
          id: 5678,
          pageCursor: 0,
        },
      ],
      undefined,
      1,
    );

    expect(shouldShowMore(tree[1234] as CommentTree)).toBe(true);
  });

  test("returns false when all direct children are already visible", () => {
    const tree = buildCommentTree([
      { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 0 },
    ]);

    expect(shouldShowMore(tree[1234] as CommentTree)).toBe(false);
  });

  test("returns false for a leaf node with no hidden children", () => {
    const tree = buildCommentTree([
      { path: "0.1234", childCount: 0, postApId, id: 1234, pageCursor: 0 },
    ]);

    expect(shouldShowMore(tree[1234] as CommentTree)).toBe(false);
  });

  test("returns false for a placeholder node that is not pruned", () => {
    const tree = buildCommentTree([
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 0 },
    ]);

    expect(shouldShowMore(tree[1234] as CommentTree)).toBe(false);
  });
});
