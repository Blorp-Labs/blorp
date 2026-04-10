import { PostCardStyleButton, PostSortButton } from "../lemmy-sort";
import { Button } from "../ui/button";
import { CommunityJoinButton } from "./community-join-button";
import { CommunityCreatePost } from "./community-create-post";
import { StickyFilterBar } from "../sticky-filter-bar";

export function CommunityPostSortBar({
  communityHandle,
}: {
  communityHandle: string | undefined;
}) {
  return (
    <StickyFilterBar className="max-md:hidden">
      <PostSortButton align="start" variant="button" />
      <PostCardStyleButton align="start" variant="button" />
      <div className="flex-1" />
      <CommunityCreatePost
        communityHandle={communityHandle}
        renderButton={(props) => (
          <Button size="sm" variant="outline" {...props}>
            Create post
          </Button>
        )}
      />
      <CommunityJoinButton communityHandle={communityHandle} />
    </StickyFilterBar>
  );
}
