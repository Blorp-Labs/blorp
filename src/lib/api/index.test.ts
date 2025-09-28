import { beforeEach, test, expect, describe, vi } from "vitest";
import * as lemmy from "@/test-utils/lemmy";
import { createQueryClientWrapper } from "@/test-utils/tanstack-query";
import { useApiClients, useComments, useCreateComment } from ".";
import { renderHook, waitFor } from "@testing-library/react";
import { CommentResponse, GetCommentsResponse } from "lemmy-v3";
import _ from "lodash";
import { resetApiClients } from "./adapters/client";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
manageFetchMockGlobally();

function mockNodeInfo() {
  fetchMock.mockGlobal().route(
    ({ url }) => url.includes("/nodeinfo/2.1"),
    JSON.stringify({
      version: "2.1",
      software: {
        name: "lemmy",
        version: "0.19.12-4-gd8445881a",
        repository: "https://github.com/LemmyNet/lemmy",
        homepage: "https://join-lemmy.org/",
      },
      protocols: ["activitypub"],
      usage: {
        users: {
          total: 177052,
          activeHalfyear: 29704,
          activeMonth: 15883,
        },
        localPosts: 529064,
        localComments: 5009935,
      },
      openRegistrations: true,
      services: {
        inbound: [],
        outbound: [],
      },
      metadata: {},
    }),
  );
}

function mockGetComments(length: number, parentId?: number) {
  const comments = Array.from({ length: length })
    .fill(0)
    .map((_i, i) =>
      lemmy.getComment({
        commentView: {
          comment: {
            id: i,
            path: _.isNumber(parentId) ? `0.${parentId}.${i}` : `0.${i}`,
          },
        },
      }),
    );

  fetchMock
    .mockGlobal()
    .route(
      ({ url }) => url.includes("/resolve_object"),
      JSON.stringify({
        post: {
          post: {
            id: 123,
          },
        },
      }),
    )
    .route(
      ({ url }) => url.includes("/comment/list"),
      JSON.stringify({
        comments,
      } satisfies GetCommentsResponse),
    );

  return comments;
}

function mockCreateComment(path: string) {
  fetchMock.mockGlobal().route(
    ({ url, options }) => url.includes("/comment") && options.method === "post",
    JSON.stringify({
      comment_view: lemmy.getComment({
        commentView: {
          comment: {
            path,
          },
        },
      }),
      recipient_ids: [],
    } satisfies CommentResponse),
  );
}

beforeEach(() => {
  resetApiClients();
  vi.resetAllMocks();
});

describe("creating comments", () => {
  test("create top level comment", async () => {
    const queryClientWrapper = createQueryClientWrapper();

    const numComments = _.random(0, 10);

    const POST_AP_ID = "https://blorpblorp.xyz/p/123456789";

    mockNodeInfo();
    const apis = renderHook(() => useApiClients(), {
      wrapper: queryClientWrapper,
    });
    await apis.result.current.api;

    mockGetComments(numComments);
    const allComments = renderHook(
      () =>
        useComments({
          postApId: POST_AP_ID,
        }),
      {
        wrapper: queryClientWrapper,
      },
    );

    const createComment = renderHook(() => useCreateComment(), {
      wrapper: queryClientWrapper,
    });

    await waitFor(() => {
      if (
        allComments.result.current.data?.pages.flatMap((p) => p.comments)
          .length !== numComments
      ) {
        throw true;
      }
    });

    const NEW_COMMENT_PATH = "0.1234";
    const pages1 = allComments.result.current.data?.pages;
    expect(pages1?.flatMap((p) => p.comments)).not.toContain(NEW_COMMENT_PATH);

    mockCreateComment(NEW_COMMENT_PATH);

    await createComment.result.current.mutateAsync({
      body: "New comment",
      postApId: POST_AP_ID,
    });
    allComments.rerender();

    const pages2 = allComments.result.current.data?.pages;
    expect(pages2?.flatMap((p) => p.comments)).toContain(NEW_COMMENT_PATH);
  });

  test("create reply comment", async () => {
    const queryClientWrapper = createQueryClientWrapper();

    mockNodeInfo();
    const apis = renderHook(() => useApiClients(), {
      wrapper: queryClientWrapper,
    });
    await apis.result.current.api;

    const numComments = _.random(1, 10);
    const [parentComment] = mockGetComments(numComments);
    if (!parentComment) {
      throw new Error("this shouldn't happen");
    }

    const POST_AP_ID = "https://blorpblorp.xyz/p/123456789";

    const allComments = renderHook(
      () =>
        useComments({
          postApId: POST_AP_ID,
        }),
      {
        wrapper: queryClientWrapper,
      },
    );

    const createComment = renderHook(() => useCreateComment(), {
      wrapper: queryClientWrapper,
    });

    await waitFor(() => {
      if (
        allComments.result.current.data?.pages.flatMap((p) => p.comments)
          .length !== numComments
      ) {
        throw true;
      }
    });

    const parentPath = parentComment.comment.path;
    const NEW_COMMENT_PATH = `${parentPath}.1234`;

    const pages1 = allComments.result.current.data?.pages;
    expect(pages1?.flatMap((p) => p.comments)).not.toContain(NEW_COMMENT_PATH);

    mockCreateComment(NEW_COMMENT_PATH);

    await createComment.result.current.mutateAsync({
      body: "New comment",
      postApId: POST_AP_ID,
      parentPath: parentComment?.comment.path,
    });
    allComments.rerender();

    const pages2 = allComments.result.current.data?.pages;
    expect(pages2?.flatMap((p) => p.comments)).toContain(NEW_COMMENT_PATH);
  });

  test("create reply comment while in thread", async () => {
    const queryClientWrapper = createQueryClientWrapper();

    mockNodeInfo();
    const apis = renderHook(() => useApiClients(), {
      wrapper: queryClientWrapper,
    });
    await apis.result.current.api;

    const POST_AP_ID = "https://blorpblorp.xyz/p/123456789";
    const PARENT_ID = 4567;

    const numComments = _.random(1, 10);
    const mockedComments = mockGetComments(numComments, PARENT_ID);
    const parentComment = _.sample(mockedComments);
    if (!parentComment) {
      throw new Error("this shouldn't happen");
    }

    const allComments = renderHook(
      () =>
        useComments({
          postApId: POST_AP_ID,
          parentId: PARENT_ID,
        }),
      {
        wrapper: queryClientWrapper,
      },
    );

    const createComment = renderHook(() => useCreateComment(), {
      wrapper: queryClientWrapper,
    });

    await waitFor(() => {
      if (
        allComments.result.current.data?.pages.flatMap((p) => p.comments)
          .length !== numComments
      ) {
        throw true;
      }
    });

    const parentPath = parentComment.comment.path;
    const NEW_COMMENT_PATH = `${parentPath}.1234`;

    const pages1 = allComments.result.current.data?.pages;
    expect(pages1?.flatMap((p) => p.comments)).not.toContain(NEW_COMMENT_PATH);

    mockCreateComment(NEW_COMMENT_PATH);

    await createComment.result.current.mutateAsync({
      body: "New comment",
      postApId: POST_AP_ID,
      parentId: parentComment?.comment.id,
      parentPath: parentComment?.comment.path,
      queryKeyParentId: PARENT_ID,
    });
    allComments.rerender();

    const pages2 = allComments.result.current.data?.pages;
    expect(pages2?.flatMap((p) => p.comments)).toContain(NEW_COMMENT_PATH);
  });
});
