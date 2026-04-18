import { describe, test, expect } from "vitest";
import { buildCommentTree, CommentTreeTopLevel } from "./comment-tree";

const postApId = `https://blorpblorp.xyz/p/123456`;

describe("buildCommentTree", () => {
  test.each([
    [
      "top level comments",
      [
        { path: "0.1234", childCount: 2, postApId, id: 1234 },
        {
          path: "0.1234.5678",
          childCount: 1,
          postApId,
          id: 5678,
        },
        {
          path: "0.1234.5678.9101112",
          childCount: 0,
          postApId,
          id: 9101112,
        },
      ],
      {
        1234: {
          sort: 0,
          imediateChildren: 1,
          comment: {
            id: 1234,
            path: "0.1234",
            childCount: 2,
            postApId,
          },
          5678: {
            sort: 1,
            imediateChildren: 1,
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 1,
              postApId,
            },
            9101112: {
              sort: 2,
              imediateChildren: 0,
              comment: {
                id: 9101112,
                path: "0.1234.5678.9101112",
                childCount: 0,
                postApId,
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
        },
        {
          path: "0.1234.5678.9101112",
          childCount: 0,
          postApId,
          id: 9101112,
        },
      ],
      {
        1234: {
          imediateChildren: 0,
          5678: {
            imediateChildren: 1,
            9101112: {
              imediateChildren: 0,
              comment: {
                id: 9101112,
                path: "0.1234.5678.9101112",
                childCount: 0,
                postApId,
              },
              sort: 1,
            },
            comment: {
              id: 5678,
              path: "0.1234.5678",
              childCount: 1,
              postApId,
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
  ])("%s", (_, comments, commentTree, commentPath) => {
    expect(buildCommentTree(comments, commentPath)).toEqual(commentTree);
  });
});
