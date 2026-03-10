import { ContentGutters } from "../gutters";
import { PostCardStyleButton, PostSortButton } from "../lemmy-sort";
import { FeedJoinButton } from "./feed-join-button";

export function FeedPostSortBar({ apId }: { apId: string | undefined }) {
  return (
    <ContentGutters className="max-md:hidden">
      <div className="flex flex-row md:h-12 md:border-b md:bg-background flex-1 items-center gap-2">
        <PostSortButton align="start" variant="button" />
        <PostCardStyleButton align="start" variant="button" />
        <div className="flex-1" />
        <FeedJoinButton feedApId={apId} />
      </div>
      <></>
    </ContentGutters>
  );
}
