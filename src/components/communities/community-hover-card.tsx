import { useCommunity } from "@/src/lib/api/index";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useCommunitiesStore } from "@/src/stores/communities";
import { LuCakeSlice } from "react-icons/lu";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { useState } from "react";
import { useAuth } from "@/src/stores/auth";
import { AggregateBadges } from "../aggregates";
import { CommunityJoinButton } from "./community-join-button";
import { DateTime } from "../datetime";

dayjs.extend(localizedFormat);

export function CommunityHoverCard({
  communityName,
  children,
}: {
  communityName: string;
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  useCommunity({
    name: communityName,
    enabled,
  });
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const data = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(communityName)]?.data,
  );

  const community = data?.communityView;
  const createdAt = community ? dayjs(community.createdAt) : null;

  return (
    <HoverCard onOpenChange={() => setEnabled(true)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="flex flex-col gap-2.5 py-4 flex-1"
      >
        <span className="font-semibold text-sm">{community?.slug}</span>

        <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <LuCakeSlice />
          <span>
            Created <DateTime date={createdAt} />
          </span>
        </div>

        <AggregateBadges
          className="mt-1"
          aggregates={{
            Subscribers: community?.subscriberCount,
            Posts: community?.postCount,
            Comments: community?.commentCount,
          }}
        />
        {community && (
          <CommunityJoinButton
            communityName={communityName}
            className="mt-1.5"
          />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
