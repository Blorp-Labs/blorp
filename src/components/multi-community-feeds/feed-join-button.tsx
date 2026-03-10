import { Button } from "../ui/button";
import { useAuth } from "@/src/stores/auth";
import { useMultiCommunityFeedFromStore } from "@/src/stores/multi-community-feeds";

interface Props {
  feedApId: string | undefined;
  className?: string;
}

export function FeedJoinButton({ feedApId, ...props }: Props) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const feed = useMultiCommunityFeedFromStore(feedApId)?.feedView;
  const subscribed = feed?.subscribed;

  if (!isLoggedIn) {
    return null;
  }

  return (
    <Button size="sm" variant={subscribed ? "outline" : "default"} {...props}>
      {subscribed ? "Followed" : "Follow"}
    </Button>
  );
}
