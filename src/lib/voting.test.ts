import { describe, test, expect } from "vitest";
import { resolveVoteCounts } from "./voting";

describe("resolveVoteCounts", () => {
  describe("display counts with no pending vote", () => {
    test("returns raw counts when no vote is cast", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: 0,
        optimisticMyVote: undefined,
      });
      expect(result.displayUpvotes).toBe(10);
      expect(result.displayDownvotes).toBe(2);
      expect(result.displayScore).toBe(8);
    });

    test("treats null myVote the same as 0", () => {
      const result = resolveVoteCounts({
        upvotes: 5,
        downvotes: 1,
        myVote: null,
        optimisticMyVote: null,
      });
      expect(result.displayUpvotes).toBe(5);
      expect(result.displayDownvotes).toBe(1);
    });
  });

  describe("optimistic upvote", () => {
    test("adds 1 upvote when going from no vote to upvote", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: 0,
        optimisticMyVote: 1,
      });
      expect(result.displayUpvotes).toBe(11);
      expect(result.displayDownvotes).toBe(2);
      expect(result.displayScore).toBe(9);
      expect(result.isUpvoted).toBe(true);
      expect(result.isDownvoted).toBe(false);
    });

    test("removes upvote when toggling off", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: 1,
        optimisticMyVote: 0,
      });
      expect(result.displayUpvotes).toBe(9);
      expect(result.displayDownvotes).toBe(2);
      expect(result.isUpvoted).toBe(false);
    });

    test("switches from downvote to upvote", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: -1,
        optimisticMyVote: 1,
      });
      expect(result.displayUpvotes).toBe(11);
      expect(result.displayDownvotes).toBe(1);
      expect(result.displayScore).toBe(10);
      expect(result.isUpvoted).toBe(true);
      expect(result.isDownvoted).toBe(false);
    });
  });

  describe("optimistic downvote", () => {
    test("adds 1 downvote when going from no vote to downvote", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: 0,
        optimisticMyVote: -1,
      });
      expect(result.displayUpvotes).toBe(10);
      expect(result.displayDownvotes).toBe(3);
      expect(result.displayScore).toBe(7);
      expect(result.isUpvoted).toBe(false);
      expect(result.isDownvoted).toBe(true);
    });

    test("removes downvote when toggling off", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: -1,
        optimisticMyVote: 0,
      });
      expect(result.displayDownvotes).toBe(1);
      expect(result.isDownvoted).toBe(false);
    });

    test("switches from upvote to downvote", () => {
      const result = resolveVoteCounts({
        upvotes: 10,
        downvotes: 2,
        myVote: 1,
        optimisticMyVote: -1,
      });
      expect(result.displayUpvotes).toBe(9);
      expect(result.displayDownvotes).toBe(3);
      expect(result.displayScore).toBe(6);
      expect(result.isUpvoted).toBe(false);
      expect(result.isDownvoted).toBe(true);
    });
  });

  describe("isUpvoted / isDownvoted reflect optimistic state", () => {
    test("committed upvote with no pending change", () => {
      const result = resolveVoteCounts({ upvotes: 5, downvotes: 0, myVote: 1 });
      expect(result.isUpvoted).toBe(true);
      expect(result.isDownvoted).toBe(false);
    });

    test("committed downvote with no pending change", () => {
      const result = resolveVoteCounts({
        upvotes: 0,
        downvotes: 3,
        myVote: -1,
      });
      expect(result.isUpvoted).toBe(false);
      expect(result.isDownvoted).toBe(true);
    });

    test("optimistic state overrides committed state for display", () => {
      const result = resolveVoteCounts({
        upvotes: 5,
        downvotes: 0,
        myVote: 1,
        optimisticMyVote: 0,
      });
      expect(result.isUpvoted).toBe(false);
    });
  });
});
