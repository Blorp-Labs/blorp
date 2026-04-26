import { describe, expect, test } from "vitest";
import {
  buildCommentTree,
  COMMENT_COLOR_PALETTE,
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
        { threadRootId: "0.1" },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(tree.children[5]).toBeUndefined();
      expect(tree.children[6]).toBeUndefined();
    });

    test("keeps comments exactly at the requested subtree root", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(2, "0.1.2")],
        { threadRootId: "0.1" },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(getNodeByKey(getNodeByKey(tree, 1), 2).comment?.id).toBe(2);
    });

    test("ignores comments outside the requested subtree", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(5, "0.5"), commentView(6, "0.5.6")],
        { threadRootId: "0.1" },
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
        { threadRootId: "0.3456.7890" },
      );

      expect(getNodeByKey(tree, 7890).comment?.id).toBe(7890);
      expect(getNodeByKey(getNodeByKey(tree, 7890), 11111).comment?.id).toBe(
        11111,
      );
      expect(tree.children[3456]).toBeUndefined();
    });

    test("creates placeholders only within the requested subtree when ancestors inside it are missing", () => {
      const tree = buildCommentTree([commentView(5, "0.1.2.3.4.5")], {
        threadRootId: "0.1.2.3",
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
        { threadRootId: "0.1" },
      );

      expect(getNodeByKey(tree, 1).comment?.id).toBe(1);
      expect(tree.children[12]).toBeUndefined();
      expect(tree.children[10]).toBeUndefined();
    });

    test("returns empty children when commentPath targets a comment not in the list", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1"), commentView(2, "0.1.2")],
        { threadRootId: "0.999" },
      );

      expect(tree.children).toEqual({});
    });

    test("sorts highlightCommentId to top among siblings", () => {
      // node 3 inserted before node 2, so without highlighting node 2 gets sort=1
      const tree = buildCommentTree(
        [
          commentView(3, "0.1.3"),
          commentView(2, "0.1.2"),
          commentView(1, "0.1"),
        ],
        { threadRootId: "1", selectedCommentId: "2" },
      );

      const parentNode = getNodeByKey(tree, 1);
      expect(getNodeByKey(parentNode, 2).meta.sort).toBe(-1);
      expect(getNodeByKey(parentNode, 3).meta.sort).not.toBe(-1);
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

    test("keeps immediateChildren > 0 on the last visible node when maxDepth truncates deeper comments", () => {
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
      expect(node2.meta.immediateChildren).toBeGreaterThan(0);
    });

    test("respects maxDepth relative to the commentPath root", () => {
      // depths relative to commentPath "0.1": node1=0, node2=1, node3=2, node4=3
      const tree = buildCommentTree(
        [
          commentView(1, "0.1"),
          commentView(2, "0.1.2"),
          commentView(3, "0.1.2.3"),
          commentView(4, "0.1.2.3.4"),
        ],
        { threadRootId: "0.1", maxDepth: 2 },
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      const node3 = getNodeByKey(node2, 3);
      expect(node1.comment?.id).toBe(1);
      expect(node2.comment?.id).toBe(2);
      expect(node3.comment?.id).toBe(3);
      expect(node3.children[4]).toBeUndefined();
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

    test("prunes a cross-page direct child even when a placeholder sibling is present", () => {
      // node 2 is missing, creating a placeholder; node 4 is a direct child of node 1
      // on a different page. The placeholder must not short-circuit pruning of node 4.
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 2),
          commentView(3, "0.1.2.3"),
          commentView(4, "0.1.4"),
        ],
        { getCommentPageCursor: (c) => (c.id === 1 ? 1 : 2) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.pruned).toBe(true);
      expect(node1.children[4]).toBeUndefined();
    });

    test("prunes a cross-page comment that arrives through a placeholder ancestor", () => {
      // node 2 never loaded — becomes a placeholder with cursor=2 (inherited from node 3)
      // node 3 (cursor=2) arrives on a different page than node 1 (cursor=1)
      // placeholder's cursor (2) differs from parent's cursor (1), so the whole
      // placeholder branch is removed
      const tree = buildCommentTree(
        [commentView(1, "0.1", 1), commentView(3, "0.1.2.3")],
        { getCommentPageCursor: (c) => (c.id === 1 ? 1 : 2) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.children[2]).toBeUndefined();
    });

    test("placeholder created by a descendant inherits that descendant's cursor", () => {
      const tree = buildCommentTree([commentView(3, "0.1.2.3")], {
        getCommentPageCursor: () => 5,
      });

      const placeholder1 = getNodeByKey(tree, 1);
      const placeholder2 = getNodeByKey(placeholder1, 2);
      expect(placeholder1.comment).toBeUndefined();
      expect(placeholder1.meta.pageCursor).toBe(5);
      expect(placeholder2.comment).toBeUndefined();
      expect(placeholder2.meta.pageCursor).toBe(5);
    });

    test("comment hydrating a placeholder inherits the placeholder's cursor", () => {
      // comment 2 (cursor=2) arrives first, creating placeholder 1 with cursor=2
      // comment 1 (cursor=3) arrives later to hydrate the placeholder
      // comment 1 should get cursor=2 (when the branch first became visible), not cursor=3
      const tree = buildCommentTree(
        [commentView(2, "0.1.2"), commentView(1, "0.1")],
        { getCommentPageCursor: (c) => (c.id === 2 ? 2 : 3) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.comment?.id).toBe(1);
      expect(node1.meta.pageCursor).toBe(2);
    });

    test("prunes only the first cross-page node in a deep chain, leaving ancestors intact", () => {
      // 1→2→3→4, all page 1 except node 4 (page 2)
      // node 3 should be pruned and node 4 removed; nodes 1 and 2 unaffected
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 1),
          commentView(2, "0.1.2", 1),
          commentView(3, "0.1.2.3", 1),
          commentView(4, "0.1.2.3.4"),
        ],
        { getCommentPageCursor: (c) => (c.id === 4 ? 2 : 1) },
      );

      const node1 = getNodeByKey(tree, 1);
      const node2 = getNodeByKey(node1, 2);
      const node3 = getNodeByKey(node2, 3);
      expect(node1.meta.pruned).toBe(false);
      expect(node2.meta.pruned).toBe(false);
      expect(node3.meta.pruned).toBe(true);
      expect(node3.children[4]).toBeUndefined();
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
      expect(node1.meta.immediateChildren).toBe(2);
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
      expect(node1.meta.immediateChildren).toBe(5);
    });

    test("retains missing-child count after pruning removes direct children", () => {
      const tree = buildCommentTree(
        [commentView(1, "0.1", 3), commentView(2, "0.1.2", 0)],
        { getCommentPageCursor: (c) => (c.id === 2 ? 2 : 1) },
      );

      const node1 = getNodeByKey(tree, 1);
      expect(node1.meta.immediateChildren).toBe(3);
      expect(node1.meta.pruned).toBe(true);
    });

    test("reports a hidden sibling correctly when visible children have childCounts that sum to the parent's childCount", () => {
      const tree = buildCommentTree(
        [
          commentView(1, "0.1", 3),
          commentView(2, "0.1.2", 2),
          commentView(3, "0.1.3", 1),
          // fourth direct child of node 1 is missing
        ],
        {},
      );

      const node1 = getNodeByKey(tree, 1);
      expect(shouldShowMore(node1)).toBe(true);
    });
  });
});

describe("shouldShowMore", () => {
  test("returns true when a node is pruned", () => {
    const node = {
      meta: {
        sort: 0,
        immediateChildren: 1,
        pruned: true,
        colorIndex: 0,
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
        immediateChildren: 1,
        pruned: false,
        colorIndex: 0,
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
        immediateChildren: 1,
        pruned: false,
        colorIndex: 0,
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
            immediateChildren: 0,
            pruned: false,
            colorIndex: 0,
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
        immediateChildren: 0,
        pruned: false,
        colorIndex: 0,
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
        immediateChildren: 0,
        pruned: false,
        colorIndex: 0,
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
        immediateChildren: 2,
        pruned: false,
        colorIndex: 0,
      },
      children: {
        5678: {
          meta: {
            sort: 2,
            immediateChildren: 0,
            pruned: false,
            colorIndex: 0,
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
            immediateChildren: 0,
            pruned: false,
            colorIndex: 0,
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
            immediateChildren: 0,
            pruned: false,
            colorIndex: 0,
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
        immediateChildren: 1,
        pruned: true,
        colorIndex: 0,
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
            immediateChildren: 0,
            pruned: false,
            colorIndex: 0,
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
        immediateChildren: 0,
        pruned: false,
        colorIndex: 0,
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

describe("colorIndex", () => {
  test("top-level node gets colorIndex 0", () => {
    const tree = buildCommentTree([commentView(1, "0.1")], {});
    expect(getNodeByKey(tree, 1).meta.colorIndex).toBe(0);
  });

  test("nested nodes increment colorIndex by 1 per level", () => {
    const tree = buildCommentTree(
      [
        commentView(1, "0.1"),
        commentView(2, "0.1.2"),
        commentView(3, "0.1.2.3"),
      ],
      {},
    );
    expect(getNodeByKey(tree, 1).meta.colorIndex).toBe(0);
    expect(getNodeByKey(getNodeByKey(tree, 1), 2).meta.colorIndex).toBe(1);
    expect(
      getNodeByKey(getNodeByKey(getNodeByKey(tree, 1), 2), 3).meta.colorIndex,
    ).toBe(2);
  });

  test("placeholder chain gets consecutive colorIndex values — no adjacent match mod 6", () => {
    // only comment 3 present; placeholders at 1 and 2 fill the ancestors
    const tree = buildCommentTree([commentView(3, "0.1.2.3")], {});
    const p1 = getNodeByKey(tree, 1);
    const p2 = getNodeByKey(p1, 2);
    const n3 = getNodeByKey(p2, 3);
    expect(p1.comment).toBeUndefined();
    expect(p2.comment).toBeUndefined();
    expect(p1.meta.colorIndex).toBe(0);
    expect(p2.meta.colorIndex).toBe(1);
    expect(n3.meta.colorIndex).toBe(2);
    const n = COMMENT_COLOR_PALETTE.length;
    expect(p1.meta.colorIndex % n).not.toBe(p2.meta.colorIndex % n);
    expect(p2.meta.colorIndex % n).not.toBe(n3.meta.colorIndex % n);
  });

  test("hydrating a placeholder leaves colorIndex unchanged", () => {
    // insert descendant first to create placeholder at 1, then hydrate
    const tree = buildCommentTree(
      [commentView(2, "0.1.2"), commentView(1, "0.1")],
      {},
    );
    expect(getNodeByKey(tree, 1).meta.colorIndex).toBe(0);
  });

  test("with threadRootId and no offset, thread root gets colorIndex 0", () => {
    const tree = buildCommentTree(
      [commentView(1, "0.1"), commentView(2, "0.1.2")],
      { threadRootId: "1" },
    );
    expect(getNodeByKey(tree, 1).meta.colorIndex).toBe(0);
    expect(getNodeByKey(getNodeByKey(tree, 1), 2).meta.colorIndex).toBe(1);
  });

  test("colorIndexOffset shifts every node by the offset", () => {
    const tree = buildCommentTree(
      [commentView(1, "0.1"), commentView(2, "0.1.2")],
      { colorIndexOffset: 3 },
    );
    expect(getNodeByKey(tree, 1).meta.colorIndex).toBe(3);
    expect(getNodeByKey(getNodeByKey(tree, 1), 2).meta.colorIndex).toBe(4);
  });

  test("colorIndexOffset with threadRootId anchors thread colors to absolute depth", () => {
    // thread root has absolute depth 2 in the full tree; caller passes offset=2
    const tree = buildCommentTree(
      [
        commentView(1, "0.1"),
        commentView(2, "0.1.2"),
        commentView(3, "0.1.2.3"),
      ],
      { threadRootId: "1", colorIndexOffset: 2 },
    );
    expect(getNodeByKey(tree, 1).meta.colorIndex).toBe(2);
    expect(getNodeByKey(getNodeByKey(tree, 1), 2).meta.colorIndex).toBe(3);
    expect(
      getNodeByKey(getNodeByKey(getNodeByKey(tree, 1), 2), 3).meta.colorIndex,
    ).toBe(4);
  });
});
