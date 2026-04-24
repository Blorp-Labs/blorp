import { describe, expect, test } from "vitest";
import {
  buildCommentTree,
  CommentTree,
  getCommentChildren,
  shouldShowMore,
  CommentTreeTopLevel,
} from "./comment-tree";

function getNodeByKey(
  tree: CommentTreeTopLevel | CommentTree,
  key: number,
): CommentTree {
  const node = tree.children[key];
  if (!node) {
    throw new Error(`Expected node ${key} to exist`);
  }
  return node;
}

const postApId = "https://blorpblorp.xyz/p/123456";

describe("buildCommentTree", () => {
  describe("deduplication", () => {
    test.todo(
      "keeps the first occurrence when duplicate comment ids are present",
    );
  });

  describe("tree construction", () => {
    test.todo("returns an empty top-level when no comments are provided");
    test.todo("builds nested nodes from comment paths");
    test.todo("preserves insertion order through sort values");
    test.todo(
      "creates a top-level placeholder node when the root comment is missing",
    );
    test.todo(
      "creates intermediate placeholder nodes when middle comments are missing",
    );
    test.todo(
      "hydrates a top-level placeholder when the real comment later arrives without disturbing sibling order",
    );
    test.todo(
      "hydrates an intermediate placeholder when the real comment later arrives and preserves its existing descendants",
    );
    test.todo(
      "does not overwrite an existing real ancestor when later descendants reuse it",
    );
  });

  describe("path filtering", () => {
    test.todo(
      "returns only the requested subtree when commentPath is provided",
    );
    test.todo("keeps comments exactly at the requested subtree root");
    test.todo("ignores comments outside the requested subtree");
    test.todo(
      "re-roots matching deep paths so the requested subtree appears at top-level",
    );
    test.todo(
      "creates placeholders only within the requested subtree when ancestors inside it are missing",
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
      "does not prune a branch when a new comment hydrates an existing placeholder",
    );
    test.todo("compares pageCursor against the immediate parent, not the root");
    test.todo(
      "clips a cross-page branch when the new comment does not hydrate an existing placeholder",
    );
    test.todo("does not prune when getCommentPageCursor is not provided");
    test.todo(
      "does not prune a child when getCommentPageCursor returns undefined for it",
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
  });
});

describe("shouldShowMore", () => {
  test("returns true when a node is pruned", () => {
    const node = {
      meta: {
        sort: 0,
        imediateChildren: 1,
        pruned: true,
      },
      comment: {
        id: 1234,
        path: "0.1234",
        childCount: 1,
        postApId,
      },
      children: {},
    } satisfies CommentTree;

    expect(shouldShowMore(node)).toBe(true);
  });

  test("returns true when maxDepth truncates direct children from the visible tree", () => {
    const node = {
      meta: {
        sort: 0,
        imediateChildren: 1,
        pruned: false,
      },
      comment: {
        id: 1234,
        path: "0.1234",
        childCount: 1,
        postApId,
      },
      children: {},
    } satisfies CommentTree;

    expect(shouldShowMore(node)).toBe(true);
  });

  test("returns false when all direct children are already visible", () => {
    const node = {
      meta: {
        sort: 0,
        imediateChildren: 1,
        pruned: false,
      },
      comment: {
        id: 1234,
        path: "0.1234",
        childCount: 1,
        postApId,
      },
      children: {
        5678: {
          meta: {
            sort: 1,
            imediateChildren: 0,
            pruned: false,
          },
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 0,
            postApId,
          },
          children: {},
        },
      },
    } satisfies CommentTree;

    expect(shouldShowMore(node)).toBe(false);
  });

  test("returns false for a leaf node with no hidden children", () => {
    const tree = {
      meta: {
        sort: 0,
        imediateChildren: 0,
        pruned: false,
      },
      comment: {
        id: 1234,
        path: "0.1234",
        childCount: 0,
        postApId,
      },
      children: {},
    } satisfies CommentTree;

    expect(shouldShowMore(tree)).toBe(false);
  });

  test("returns false for a placeholder node that is not pruned", () => {
    const tree = {
      meta: {
        sort: 0,
        imediateChildren: 0,
        pruned: false,
      },
      children: {},
    } satisfies CommentTree;

    expect(shouldShowMore(tree)).toBe(false);
  });
});

describe("getCommentChildren", () => {
  test("returns child entries sorted by sort ascending", () => {
    const node = {
      meta: {
        sort: 0,
        imediateChildren: 2,
        pruned: false,
      },
      children: {
        5678: {
          meta: {
            sort: 2,
            imediateChildren: 0,
            pruned: false,
          },
          children: {},
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 0,
            postApId,
          },
        },
        9101: {
          meta: {
            sort: 0,
            imediateChildren: 0,
            pruned: false,
          },
          children: {},
          comment: {
            id: 9101,
            path: "0.1234.9101",
            childCount: 0,
            postApId,
          },
        },
        1121: {
          meta: {
            sort: 1,
            imediateChildren: 0,
            pruned: false,
          },
          children: {},
          comment: {
            id: 1121,
            path: "0.1234.1121",
            childCount: 0,
            postApId,
          },
        },
      },
    } satisfies CommentTree;

    expect(getCommentChildren(node).map(([key]) => Number(key))).toEqual([
      9101, 1121, 5678,
    ]);
  });

  test("returns only entries from the children map", () => {
    const node = {
      meta: {
        sort: 0,
        imediateChildren: 1,
        pruned: true,
      },
      comment: {
        id: 1234,
        path: "0.1234",
        childCount: 1,
        postApId,
      },
      children: {
        5678: {
          meta: {
            sort: 0,
            imediateChildren: 0,
            pruned: false,
          },
          children: {},
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 0,
            postApId,
          },
        },
      },
    } satisfies CommentTree;

    expect(getCommentChildren(node)).toHaveLength(1);
    expect(Number(getCommentChildren(node)[0]![0])).toBe(5678);
  });

  test("returns an empty array for a leaf node", () => {
    const node = {
      meta: {
        sort: 0,
        imediateChildren: 0,
        pruned: false,
      },
      comment: {
        id: 1234,
        path: "0.1234",
        childCount: 0,
        postApId,
      },
      children: {},
    } satisfies CommentTree;

    expect(getCommentChildren(node)).toEqual([]);
  });

  test("returns placeholder children along with real comment children", () => {
    const tree = buildCommentTree(
      [
        { path: "0.1234", childCount: 1, postApId, id: 1234 },
        {
          path: "0.1234.5678.9101",
          childCount: 0,
          postApId,
          id: 9101,
        },
      ],
      { getCommentPageCursor: () => 0 },
    );

    const children = getCommentChildren(getNodeByKey(tree, 1234));

    expect(children).toHaveLength(1);
    expect(Number(children[0]![0])).toBe(5678);
    expect(children[0]![1].comment).toBeUndefined();
  });

  test("returns top-level comments sorted by sort ascending", () => {
    const tree = buildCommentTree(
      [
        { path: "0.3000", childCount: 0, postApId, id: 3000 },
        { path: "0.1000", childCount: 0, postApId, id: 1000 },
        { path: "0.2000", childCount: 0, postApId, id: 2000 },
      ],
      { getCommentPageCursor: () => 0 },
    );

    expect(getCommentChildren(tree).map(([key]) => Number(key))).toEqual([
      3000, 1000, 2000,
    ]);
  });
});
