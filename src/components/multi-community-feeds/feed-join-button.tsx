import { Deferred } from "@/src/lib/deferred";
import { LoadingButton } from "../ui/button";
import { useFollowFeed } from "@/src/lib/api/index";
import { useAuth } from "@/src/stores/auth";
import { useMultiCommunityFeedFromStore } from "@/src/stores/multi-community-feeds";
import { useIonAlert } from "@ionic/react";
import { getFeedSubscribed } from "@/src/lib/api/adapters/utils";

interface Props {
  feedApId: string | undefined;
  className?: string;
}

export function FeedJoinButton({ feedApId, ...props }: Props) {
  const [alrt] = useIonAlert();

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
      onClick={async () => {
        if (feed) {
          const shouldFollow = effectiveSubscribed === "NotSubscribed";

          if (!shouldFollow) {
            const deferred = new Deferred();
            alrt({
              message: `Are you sure you want to unfollow ${feed.name}`,
              buttons: [
                {
                  text: "Cancel",
                  role: "cancel",
                  handler: () => deferred.reject(),
                },
                {
                  text: "Unfollow",
                  role: "destructive",
                  handler: () => deferred.resolve(),
                },
              ],
            });
            await deferred.promise;
          }

          follow.mutate({ feed, follow: shouldFollow });
        }
      }}
    >
      {copy}
    </LoadingButton>
  );
}
