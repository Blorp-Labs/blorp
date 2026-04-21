import { describe, test, expect } from "vitest";
import { buildCommentTree, CommentTreeTopLevel } from "./comment-tree";

const postApId = `https://blorpblorp.xyz/p/123456`;

describe("buildCommentTree", () => {
  test.each([
    [
      "top level comments",
      [
        { path: "0.1234", childCount: 2, postApId, id: 1234, pageCursor: 0 },
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
      {
        1234: {
          sort: 0,
          imediateChildren: 1,
          defaultCollapsed: false,
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
            defaultCollapsed: false,
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
              defaultCollapsed: false,
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
      } satisfies CommentTreeTopLevel,
      undefined,
    ],
    [
      "subtree of comments",
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
      {
        1234: {
          imediateChildren: 0,
          defaultCollapsed: false,
          5678: {
            imediateChildren: 1,
            defaultCollapsed: false,
            9101112: {
              imediateChildren: 0,
              defaultCollapsed: false,
              comment: {
                id: 9101112,
                path: "0.1234.5678.9101112",
                childCount: 0,
                postApId,
                pageCursor: 0,
              },
              sort: 1,
            },
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 1,
              postApId,
              pageCursor: 0,
            },
            sort: 0,
          },
          // Because 1234 is implied and doesn't actually
          // exist in the data, it get's a sort value of 0
          sort: 0,
        },
      } satisfies CommentTreeTopLevel,
      "1234.5678",
    ],
    [
      "child comment on different page is collapsed",
      [
        { path: "0.1234", childCount: 1, postApId, id: 1234, pageCursor: 0 },
        {
          path: "0.1234.5678",
          childCount: 0,
          postApId,
          id: 5678,
          pageCursor: 1,
        },
      ],
      {
        1234: {
          sort: 0,
          imediateChildren: 1,
          defaultCollapsed: false,
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
            defaultCollapsed: true,
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 0,
              postApId,
              pageCursor: 1,
            },
          },
        },
      } satisfies CommentTreeTopLevel,
      undefined,
    ],
    [
      "top-level comment on any page is not collapsed",
      [{ path: "0.1234", childCount: 0, postApId, id: 1234, pageCursor: 1 }],
      {
        1234: {
          sort: 0,
          imediateChildren: 0,
          defaultCollapsed: false,
          comment: {
            id: 1234,
            path: "0.1234",
            childCount: 0,
            postApId,
            pageCursor: 1,
          },
        },
      } satisfies CommentTreeTopLevel,
      undefined,
    ],
    [
      "grandchild on same page as parent is not collapsed",
      [
        { path: "0.1234", childCount: 2, postApId, id: 1234, pageCursor: 0 },
        {
          path: "0.1234.5678",
          childCount: 1,
          postApId,
          id: 5678,
          pageCursor: 1,
        },
        {
          path: "0.1234.5678.9101112",
          childCount: 0,
          postApId,
          id: 9101112,
          pageCursor: 1,
        },
      ],
      {
        1234: {
          sort: 0,
          imediateChildren: 1,
          defaultCollapsed: false,
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
            defaultCollapsed: true,
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 1,
              postApId,
              pageCursor: 1,
            },
            9101112: {
              sort: 2,
              imediateChildren: 0,
              defaultCollapsed: false,
              comment: {
                id: 9101112,
                path: "0.1234.5678.9101112",
                childCount: 0,
                postApId,
                pageCursor: 1,
              },
            },
          },
        },
      } satisfies CommentTreeTopLevel,
      undefined,
    ],
    [
      "grandchild on different page than parent is collapsed",
      [
        { path: "0.1234", childCount: 2, postApId, id: 1234, pageCursor: 0 },
        {
          path: "0.1234.5678",
          childCount: 1,
          postApId,
          id: 5678,
          pageCursor: 1,
        },
        {
          path: "0.1234.5678.9101112",
          childCount: 0,
          postApId,
          id: 9101112,
          pageCursor: 0,
        },
      ],
      {
        1234: {
          sort: 0,
          imediateChildren: 1,
          defaultCollapsed: false,
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
            defaultCollapsed: true,
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 1,
              postApId,
              pageCursor: 1,
            },
            9101112: {
              sort: 2,
              imediateChildren: 0,
              defaultCollapsed: true,
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
      } satisfies CommentTreeTopLevel,
      undefined,
    ],
    [
      "implied parent does not cause collapse",
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
      {
        1234: {
          imediateChildren: 0,
          defaultCollapsed: false,
          sort: 0,
          5678: {
            imediateChildren: 1,
            defaultCollapsed: false,
            sort: 0,
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 1,
              postApId,
              pageCursor: 0,
            },
            9101112: {
              imediateChildren: 0,
              defaultCollapsed: false,
              sort: 1,
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
      } satisfies CommentTreeTopLevel,
      undefined,
    ],
  ])("%s", (_, comments, commentTree, commentPath) => {
    expect(buildCommentTree(comments, commentPath)).toEqual(commentTree);
  });
});
