export function resolveVoteCounts({
  upvotes,
  downvotes,
  myVote,
  optimisticMyVote,
}: {
  upvotes: number;
  downvotes: number;
  myVote?: number | null;
  optimisticMyVote?: number | null;
}): {
  displayUpvotes: number;
  displayDownvotes: number;
  displayScore: number;
  isUpvoted: boolean;
  isDownvoted: boolean;
} {
  const prevVote = myVote ?? 0;
  const curVote = optimisticMyVote ?? prevVote;
  const upvoteDiff = (curVote > 0 ? 1 : 0) - (prevVote > 0 ? 1 : 0);
  const downvoteDiff = (curVote < 0 ? 1 : 0) - (prevVote < 0 ? 1 : 0);
  const displayUpvotes = upvotes + upvoteDiff;
  const displayDownvotes = downvotes + downvoteDiff;
  return {
    displayUpvotes,
    displayDownvotes,
    displayScore: displayUpvotes - displayDownvotes,
    isUpvoted: curVote > 0,
    isDownvoted: curVote < 0,
  };
}
