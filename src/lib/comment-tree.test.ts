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

function commentView(id: number, path: string, childCount = 0) {
  return { id, path, childCount, postApId };
}

describe("buildCommentTree", () => {
  describe("deduplication", () => {
    test("keeps the first occurrence when duplicate comment ids are present", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 0), commentView(1, "0.2", 99)],
        {},
      );

      expect(getNodeByKey(tree, 1).comment?.childCount).toBe(0);
      expect(tree.children[2]).toBeUndefined();
    });
  });

  describe("tree construction", () => {
    test("returns an empty top-level when no comments are provided", () => {
      const tree = buildCommentTree([], {});
      expect(tree.children).toEqual({});
    });

    test("builds nested nodes from comment paths", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1"),
          commentView(2, "0.1.2"),
          commentView(3, "0.1.2.3"),
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      const node3 = getNodeByKey(node2, 3);
      expect(node1.comment?.id).toBe(1);
      expect(node2.comment?.id).toBe(2);
      expect(node3.comment?.id).toBe(3);
    });

    test("preserves insertion order through sort values", () => {
      const tree = buildCommentTree(
        [
          commentView(30, "0.30"),
          commentView(10, "0.10"),
          commentView(20, "0.20"),
        ],
        {},
      );

      expect(getNodeByKey(tree, 30).meta.sort).toBe(0);
      expect(getNodeByKey(tree, 10).meta.sort).toBe(1);
      expect(getNodeByKey(tree, 20).meta.sort).toBe(2);
    });

    test("creates a top-level placeholder node when the root comment is missing", () => {
      const tree = buildCommentTree([commentView(2, "0.1.2")], {});

      const placeholder = getNodeByKey(tree, 1);
      expect(placeholder.comment).toBeUndefined();
      expect(getNodeByKey(placeholder, 2).comment?.id).toBe(2);
    });

    test("creates intermediate placeholder nodes when middle comments are missing", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(3, "0.1.2.3")],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      const placeholder2 = getNodeByKey(node1, 2);
      expect(node1.comment?.id).toBe(1);
      expect(placeholder2.comment).toBeUndefined();
      expect(getNodeByKey(placeholder2, 3).comment?.id).toBe(3);
    });

    test("hydrates a top-level placeholder and preserves relative order of unrelated siblings", () => {
      const tree = buildCommentTree(
        [
          commentView(10, "0.1.10"),
          commentView(2, "0.2"),
          commentView(3, "0.3"),
          commentView(1, "0.1"),
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.comment?.id).toBe(1);

      const topOrder = getCommentChildren(tree).map(([key]) => Number(key));
      const idx2 = topOrder.indexOf(2);
      const idx3 = topOrder.indexOf(3);
      expect(idx2).toBeGreaterThanOrEqual(0);
      expect(idx3).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeLessThan(idx3);
    });

    test("hydrates an intermediate placeholder when the real comment later arrives and preserves its existing descendants", () => {
      const tree = buildCommentTree(
        [commentView(3, "0.1.2.3"), commentView(2, "0.1.2")],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      expect(node2.comment?.id).toBe(2);
      expect(getNodeByKey(node2, 3).comment?.id).toBe(3);
    });

    test("does not overwrite an existing real ancestor when later descendants reuse it", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 5),
          commentView(2, "0.1.2"),
          commentView(3, "0.1.2.3"),
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.comment?.id).toBe(1);
      expect(node1.comment?.childCount).toBe(5);
    });
  });

  describe("path filtering", () => {
    test("returns only the requested subtree when commentPath is provided", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1"),
          commentView(2, "0.1.2"),
          commentView(5, "0.5"),
          commentView(6, "0.5.6"),
        ],
        { commentPath: "0.1" },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(tree.children[5]).toBeUndefined();
      expect(tree.children[6]).toBeUndefined();
    });

    test("keeps comments exactly at the requested subtree root", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(2, "0.1.2")],
        { commentPath: "0.1" },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(getNodeByKey(getNodeByKey(tree, 1), 2).comment?.id).toBe(2);
    });

    test("ignores comments outside the requested subtree", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(5, "0.5"), commentView(6, "0.5.6")],
        { commentPath: "0.1" },
      );

      expect(tree.children[5]).toBeUndefined();
      expect(tree.children[6]).toBeUndefined();
    });

    test("re-roots matching deep paths so the requested subtree appears at top-level", () => {
      const tree = buildCommentTree(
        [
          commentView(7890, "0.3456.7890"),
          commentView(11111, "0.3456.7890.11111"),
        ],
        { commentPath: "0.3456.7890" },
      );

      expect(getNodeByKey(tree, 7890).comment?.id).toBe(7890);
      expect(getNodeByKey(getNodeByKey(tree, 7890), 11111).comment?.id).toBe(
        11111,
      );
      expect(tree.children[3456]).toBeUndefined();
    });

    test("creates placeholders only within the requested subtree when ancestors inside it are missing", () => {
      const tree = buildCommentTree([commentView(5, "0.1.2.3.4.5")], {
        commentPath: "0.1.2.3",
      });

      const node3 = getNodeByKey(tree, 3);
      expect(node3.comment).toBeUndefined();
      const node4 = getNodeByKey(node3, 4);
      expect(node4.comment).toBeUndefined();
      expect(getNodeByKey(node4, 5).comment?.id).toBe(5);
      expect(tree.children[1]).toBeUndefined();
      expect(tree.children[2]).toBeUndefined();
    });

    test("does not match sibling paths that share a numeric prefix with commentPath", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1"),
          commentView(12, "0.12"),
          commentView(10, "0.10"),
        ],
        { commentPath: "0.1" },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(tree.children[12]).toBeUndefined();
      expect(tree.children[10]).toBeUndefined();
    });
  });

  describe("max depth", () => {
    test("omits comments deeper than the configured maxDepth", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1"),
          commentView(2, "0.1.2"),
          commentView(3, "0.1.2.3"),
        ],
        { maxDepth: 2 },
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      expect(node2.children[3]).toBeUndefined();
    });

    test("keeps imediateChildren > 0 on the last visible node when maxDepth truncates deeper comments", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 2),
          commentView(2, "0.1.2", 1),
          commentView(3, "0.1.2.3", 0),
        ],
        { maxDepth: 2 },
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      expect(node2.meta.imediateChildren).toBeGreaterThan(0);
    });
  });

  describe("pruning by page cursor", () => {
    test("marks a parent pruned when a direct child has a different pageCursor", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 1), commentView(2, "0.1.2")],
        { getCommentPageCursor: (c) => (c.id === 2 ? 2 : 1) },
      );

      expect(getNodeByKey(tree, 1).meta.pruned).toBe(true);
    });

    test("removes direct children loaded from a different page", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 1), commentView(2, "0.1.2")],
        { getCommentPageCursor: (c) => (c.id === 2 ? 2 : 1) },
      );

      expect(getNodeByKey(tree, 1).children[2]).toBeUndefined();
    });

    test("removes descendants of a pruned branch", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 2),
          commentView(2, "0.1.2", 1),
          commentView(3, "0.1.2.3"),
        ],
        { getCommentPageCursor: (c) => (c.id === 1 ? 1 : 2) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.children[2]).toBeUndefined();
    });

    test("does not prune a child when it shares the parent's pageCursor", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 1), commentView(2, "0.1.2")],
        { getCommentPageCursor: () => 1 },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.pruned).toBe(false);
      expect(getNodeByKey(node1, 2).comment?.id).toBe(2);
    });

    test("does not prune top-level comments regardless of pageCursor", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(2, "0.2"), commentView(3, "0.3")],
        { getCommentPageCursor: (c) => c.id },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(getNodeByKey(tree, 2).comment?.id).toBe(2);
      expect(getNodeByKey(tree, 3).comment?.id).toBe(3);
    });

    test("preserves descendants loaded on an earlier page when a later-page comment hydrates their placeholder ancestor", () => {
      const tree = buildCommentTree(
        [commentView(3, "0.1.2.3"), commentView(2, "0.1.2", 1)],
        { getCommentPageCursor: (c) => (c.id === 3 ? 1 : 2) },
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      expect(node2.comment?.id).toBe(2);
      expect(getNodeByKey(node2, 3).comment?.id).toBe(3);
    });

    test("compares pageCursor against the immediate parent, not the root", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 2),
          commentView(2, "0.1.2", 1),
          commentView(3, "0.1.2.3"),
        ],
        { getCommentPageCursor: (c) => (c.id === 3 ? 2 : 1) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.pruned).toBe(false);
      const node2 = getNodeByKey(node1, 2);
      expect(node2.meta.pruned).toBe(true);
      expect(node2.children[3]).toBeUndefined();
    });

    test("clips a cross-page branch when the new comment does not hydrate an existing placeholder", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 1), commentView(2, "0.1.2")],
        { getCommentPageCursor: (c) => (c.id === 2 ? 2 : 1) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.children[2]).toBeUndefined();
      expect(node1.meta.pruned).toBe(true);
    });

    test("does not prune when getCommentPageCursor is not provided", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 2),
          commentView(2, "0.1.2", 1),
          commentView(3, "0.1.2.3"),
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.pruned).toBe(false);
      const node2 = getNodeByKey(node1, 2);
      expect(node2.meta.pruned).toBe(false);
      expect(getNodeByKey(node2, 3).comment?.id).toBe(3);
    });

    test("does not prune a child when getCommentPageCursor returns undefined for it", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 1), commentView(2, "0.1.2")],
        { getCommentPageCursor: (c) => (c.id === 1 ? 1 : undefined) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.pruned).toBe(false);
      expect(getNodeByKey(node1, 2).comment?.id).toBe(2);
    });
  });

  describe("immediate children counting", () => {
    test("counts direct visible children when the full branch is present", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 2),
          commentView(2, "0.1.2", 0),
          commentView(3, "0.1.3", 0),
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.imediateChildren).toBe(2);
    });

    test("accounts for missing direct children when descendants are present", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 5),
          commentView(2, "0.1.2", 1),
          commentView(3, "0.1.2.3", 0),
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.imediateChildren).toBe(4);
    });

    test("retains missing-child count after pruning removes direct children", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 3), commentView(2, "0.1.2", 0)],
        { getCommentPageCursor: (c) => (c.id === 2 ? 2 : 1) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.imediateChildren).toBe(3);
      expect(node1.meta.pruned).toBe(true);
    });
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
      [commentView(1234, "0.1234", 1), commentView(9101, "0.1234.5678.9101")],
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
        commentView(3000, "0.3000"),
        commentView(1000, "0.1000"),
        commentView(2000, "0.2000"),
      ],
      { getCommentPageCursor: () => 0 },
    );

    expect(getCommentChildren(tree).map(([key]) => Number(key))).toEqual([
      3000, 1000, 2000,
    ]);
  });
});
