import { ContentGutters } from "../gutters";
import { PostCardStyleButton, PostSortButton } from "../lemmy-sort";
import { Button } from "../ui/button";
import { CommunityJoinButton } from "./community-join-button";
import { CommunityCreatePost } from "./community-create-post";

export function CommunityFeedSortBar({
  communityName,
}: {
  communityName: string | undefined;
}) {
  return (
    <ContentGutters className="max-md:hidden">
      <div className="flex flex-row md:h-12 md:border-b md:bg-background flex-1 items-center gap-2">
        <PostSortButton align="start" variant="button" />
        <PostCardStyleButton align="start" variant="button" />
        <div className="flex-1" />
        <CommunityCreatePost
          communityName={communityName}
          renderButton={(props) => (
            <Button size="sm" variant="outline" {...props}>
              Create post
            </Button>
          )}
        />
        <CommunityJoinButton communityName={communityName} />
      </div>
      <></>
    </ContentGutters>
  );
}
