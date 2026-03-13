import { PostSortButton, PostCardStyleButton } from "../lemmy-sort";
import { StickyFilterBar } from "../sticky-filter-bar";

export function PostsSortBar() {
  return (
    <StickyFilterBar className="max-md:hidden">
      <PostSortButton align="start" variant="button" />
      <PostCardStyleButton align="start" variant="button" />
    </StickyFilterBar>
  );
}
