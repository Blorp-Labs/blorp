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
import * as api from "@/test-utils/api";
import { usePostsStore } from "./posts";
import _ from "lodash";
import { getCachePrefixer } from "./auth";
import { Schemas } from "../lib/api/adapters/api-blueprint";

const prefix = getCachePrefixer({ instance: "123", uuid: "test" });

afterEach(() => {
  const { result } = renderHook(() => usePostsStore());
  act(() => {
    result.current.reset();
  });
});

describe("usePostsStore", () => {
  describe("cachePosts", () => {
    test("can cache multiple posts", () => {
      const post1 = api.getPost({ post: { id: api.randomDbId() } });
      const post2 = api.getPost({ post: { id: api.randomDbId() } });

      const { result } = renderHook(() => usePostsStore());

      act(() => {
        result.current.cachePosts(prefix, [post1.post, post2.post]);
      });

      expect(result.current.posts[prefix(post1.post.apId)]?.data).toMatchObject(
        post1.post,
      );
      expect(result.current.posts[prefix(post2.post.apId)]?.data).toMatchObject(
        post2.post,
      );
    });

    test("does not overwrite optimistic updates", () => {
      const post1 = api.getPost({ post: { id: api.randomDbId() } });

      const vote = _.random(-1, 1);
      const saved = _.sample([true, false]);
      const deleted = _.sample([true, false]);
      const read = _.sample([true, false]);

      const flatPostOptimistic: Schemas.Post = {
        ...post1.post,
        optimisticRead: read,
        optimisticDeleted: deleted,
        optimisticSaved: saved,
        optimisticMyVote: vote,
      };

      const { result } = renderHook(() => usePostsStore());

      act(() => {
        result.current.cachePosts(prefix, [flatPostOptimistic]);
      });

      expect(result.current.posts[prefix(post1.post.apId)]?.data).toMatchObject(
        {
          optimisticRead: read,
          optimisticDeleted: deleted,
          optimisticSaved: saved,
          optimisticMyVote: vote,
        },
      );

      act(() => {
        result.current.cachePosts(prefix, [post1.post]);
      });

      expect(result.current.posts[prefix(post1.post.apId)]?.data).toMatchObject(
        {
          optimisticRead: read,
          optimisticDeleted: deleted,
          optimisticSaved: saved,
          optimisticMyVote: vote,
        },
      );
    });
  });

  test("patchPost", () => {
    const post = api.getPost();
    const { result } = renderHook(() => usePostsStore());

    act(() => {
      result.current.cachePosts(prefix, [post.post]);
      result.current.patchPost(post.post.apId, prefix, post.post);
    });

    expect(result.current.posts[prefix(post.post.apId)]?.data).toMatchObject(
      post.post,
    );

    const vote = _.random(-1, 1);
    const saved = _.sample([true, false]);
    const deleted = _.sample([true, false]);
    const read = _.sample([true, false]);

    act(() => {
      result.current.patchPost(post.post.apId, prefix, {
        optimisticMyVote: vote,
        optimisticSaved: saved,
        optimisticDeleted: deleted,
        optimisticRead: read,
      });
    });

    expect(result.current.posts[prefix(post.post.apId)]?.data).toMatchObject({
      ...post.post,
      optimisticMyVote: vote,
      optimisticSaved: saved,
      optimisticDeleted: deleted,
      optimisticRead: read,
    });
  });
});

const FIXED_DATE = new Date("2024-01-01T00:00:00.000Z");

describe("persisted state snapshot", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("posts store shape", () => {
    const post = api.getPost({ post: { id: 123 } });
    const { result } = renderHook(() => usePostsStore());

    act(() => {
      result.current.cachePosts(prefix, [post.post]);
    });

    expect(result.current.posts).toMatchSnapshot();
    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
