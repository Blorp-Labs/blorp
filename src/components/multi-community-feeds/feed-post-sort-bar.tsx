import { PostCardStyleButton, PostSortButton } from "../lemmy-sort";
import { FeedJoinButton } from "./feed-join-button";
import { StickyFilterBar } from "../sticky-filter-bar";

export function FeedPostSortBar({ apId }: { apId: string | undefined }) {
  return (
    <StickyFilterBar className="max-md:hidden">
      <PostSortButton align="start" variant="button" />
      <PostCardStyleButton align="start" variant="button" />
      <div className="flex-1" />
      <FeedJoinButton feedApId={apId} />
    </StickyFilterBar>
  );
}
