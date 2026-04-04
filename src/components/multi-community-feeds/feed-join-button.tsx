import { LoadingButton } from "../ui/button";
import { useFollowFeed } from "@/src/api/index";
import { useAuth } from "@/src/stores/auth";
import { useMultiCommunityFeedFromStore } from "@/src/stores/multi-community-feeds";
import { getFeedSubscribed } from "@/src/api/adapters/utils";
import { useConfirmationAlert } from "@/src/hooks";

interface Props {
  feedApId: string | undefined;
  className?: string;
}

export function FeedJoinButton({ feedApId, ...props }: Props) {
  const getConfirmation = useConfirmationAlert();

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const follow = useFollowFeed();

  const feed = useMultiCommunityFeedFromStore(feedApId)?.feedView;

  const effectiveSubscribed = feed ? getFeedSubscribed(feed) : "NotSubscribed";

  // Show "Pending" text only after the mutation has settled and the server
  // still reports a pending state (e.g. waiting for federation or approval).
  // While the mutation itself is in-flight, the spinner communicates progress.
  let copy = "Follow";
  if (!follow.isPending && effectiveSubscribed === "Pending") {
    copy = "Pending";
  } else if (effectiveSubscribed === "Subscribed") {
    copy = "Followed";
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <LoadingButton
      size="sm"
      loading={follow.isPending}
      variant={effectiveSubscribed === "NotSubscribed" ? "default" : "outline"}
      {...props}
      onClick={() => {
        if (feed) {
          const shouldFollow = effectiveSubscribed === "NotSubscribed";

          if (!shouldFollow) {
            getConfirmation({
              message: `Are you sure you want to unfollow ${feed.name}?`,
              confirmText: "Unfollow",
              danger: true,
            }).then(() => follow.mutate({ feed, follow: shouldFollow }));
          } else {
            follow.mutate({ feed, follow: shouldFollow });
          }
        }
      }}
    >
      {copy}
    </LoadingButton>
  );
}
