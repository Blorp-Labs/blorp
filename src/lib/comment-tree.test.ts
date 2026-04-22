import { describe, test, expect } from "vitest";
import { buildCommentTree, CommentTreeTopLevel } from "./comment-tree";

const postApId = `https://blorpblorp.xyz/p/123456`;

describe("buildCommentTree", () => {
  test("builds nested tree with correct sort and imediateChildren", () => {
    const result = buildCommentTree([
      { path: "0.1234", childCount: 2, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 1, postApId, id: 5678, pageCursor: 0 },
      {
        path: "0.1234.5678.9101112",
        childCount: 0,
        postApId,
        id: 9101112,
        pageCursor: 0,
      },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 1,
        pruned: false,
        comment: {
          id: 1234,
          path: "0.1234",
          childCount: 2,
          postApId,
          pageCursor: 0,
        },
        5678: {
          sort: 1,
          imediateChildren: 1,
          pruned: false,
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 1,
            postApId,
            pageCursor: 0,
          },
          9101112: {
            sort: 2,
            imediateChildren: 0,
            pruned: false,
            comment: {
              id: 9101112,
              path: "0.1234.5678.9101112",
              childCount: 0,
              postApId,
              pageCursor: 0,
            },
          },
        },
      },
    } satisfies CommentTreeTopLevel);
  });

  test("filters to subtree when commentPath provided", () => {
    const result = buildCommentTree(
      [
        {
          path: "0.1234.5678",
          childCount: 1,
          postApId,
          id: 5678,
          pageCursor: 0,
        },
        {
          path: "0.1234.5678.9101112",
          childCount: 0,
          postApId,
          id: 9101112,
          pageCursor: 0,
        },
      ],
      "1234.5678",
    );

    expect(result).toEqual({
      1234: {
        // Because 1234 is implied and doesn't actually
        // exist in the data, it get's a sort value of 0
        sort: 0,
        imediateChildren: 0,
        pruned: false,
        5678: {
          sort: 0,
          imediateChildren: 1,
          pruned: false,
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 1,
            postApId,
            pageCursor: 0,
          },
          9101112: {
            sort: 1,
            imediateChildren: 0,
            pruned: false,
            comment: {
              id: 9101112,
              path: "0.1234.5678.9101112",
              childCount: 0,
              postApId,
              pageCursor: 0,
            },
          },
        },
      },
    } satisfies CommentTreeTopLevel);
  });

  test("marks parent pruned when direct child pageCursor differs", () => {
    const result = buildCommentTree([
      { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 1 },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 1,
        pruned: true,
        comment: {
          id: 1234,
          path: "0.1234",
          childCount: 1,
          postApId,
          pageCursor: 0,
        },
        // 5678 absent from tree
      },
    } satisfies CommentTreeTopLevel);
  });

  test("does not prune top-level comment regardless of pageCursor", () => {
    const result = buildCommentTree([
      { path: "0.1234", childCount: 0, postApId, id: 1234, pageCursor: 1 },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 0,
        pruned: false,
        comment: {
          id: 1234,
          path: "0.1234",
          childCount: 0,
          postApId,
          pageCursor: 1,
        },
      },
    } satisfies CommentTreeTopLevel);
  });

  test("omits all descendants when a comment is pruned", () => {
    // child p1 is pruned (parent p0), grandchild p1 is also omitted (ancestor pruned)
    const result = buildCommentTree([
      { path: "0.1234", childCount: 2, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 1, postApId, id: 5678, pageCursor: 1 },
      {
        path: "0.1234.5678.9101112",
        childCount: 0,
        postApId,
        id: 9101112,
        pageCursor: 1,
      },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 1,
        pruned: true,
        comment: {
          id: 1234,
          path: "0.1234",
          childCount: 2,
          postApId,
          pageCursor: 0,
        },
        // 5678 and 9101112 absent
      },
    } satisfies CommentTreeTopLevel);
  });

  test("omits descendant even when its pageCursor matches root", () => {
    // child p1 pruned, grandchild p0 — but still omitted because ancestor is pruned
    const result = buildCommentTree([
      { path: "0.1234", childCount: 2, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 1, postApId, id: 5678, pageCursor: 1 },
      {
        path: "0.1234.5678.9101112",
        childCount: 0,
        postApId,
        id: 9101112,
        pageCursor: 0,
      },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 1,
        pruned: true,
        comment: {
          id: 1234,
          path: "0.1234",
          childCount: 2,
          postApId,
          pageCursor: 0,
        },
        // 5678 absent (pruned), 9101112 absent (ancestor pruned)
      },
    } satisfies CommentTreeTopLevel);
  });

  test("does not prune comment with same pageCursor as parent", () => {
    const result = buildCommentTree([
      { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 0 },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 1,
        pruned: false,
        comment: {
          id: 1234,
          path: "0.1234",
          childCount: 1,
          postApId,
          pageCursor: 0,
        },
        5678: {
          sort: 1,
          imediateChildren: 0,
          pruned: false,
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 0,
            postApId,
            pageCursor: 0,
          },
        },
      },
    } satisfies CommentTreeTopLevel);
  });

  test("implied parent does not trigger pruning", () => {
    // 1234 has no comment in the data (implied parent); child 5678 p0 should not be pruned
    const result = buildCommentTree([
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 0 },
    ]);

    expect(result).toEqual({
      1234: {
        sort: 0,
        imediateChildren: 0,
        pruned: false,
        5678: {
          sort: 0,
          imediateChildren: 0,
          pruned: false,
          comment: {
            id: 5678,
            path: "0.1234.5678",
            childCount: 0,
            postApId,
            pageCursor: 0,
          },
        },
      },
    } satisfies CommentTreeTopLevel);
  });

  test("imediateChildren > 0 when direct child is pruned", () => {
    const result = buildCommentTree([
      { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
      { path: "0.1234.5678", childCount: 0, postApId, id: 5678, pageCursor: 1 },
    ]);

    expect(result[1234]!.imediateChildren).toBeGreaterThan(0);
  });
});
