import { ContentGutters } from "../gutters";
import { PostSortButton, PostCardStyleButton } from "../lemmy-sort";

export function PostFeedSortBar() {
  return (
    <ContentGutters className="max-md:hidden">
      <div className="flex flex-row md:h-12 md:border-b md:bg-background flex-1 items-center gap-2">
        <PostSortButton align="start" variant="button" />
        <PostCardStyleButton align="start" variant="button" />
      </div>
      <></>
    </ContentGutters>
  );
}
