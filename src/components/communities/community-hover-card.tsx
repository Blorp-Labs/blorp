// eslint-disable-next-line local/no-query-hooks-in-components -- hover card fetches lazily on hover; the parent can't predict which community cards will be opened and can't pre-fetch this data.
import { useCommunityQuery } from "@/src/queries/index";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useCommunityFromStore } from "@/src/stores/communities";
import { LuCakeSlice } from "react-icons/lu";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { useState } from "react";
import { AggregateBadges } from "../aggregates";
import { CommunityJoinButton } from "./community-join-button";
import { DateTime } from "../datetime";
import { Handle } from "@/src/lib/handle";

dayjs.extend(localizedFormat);

export function CommunityHoverCard({
  communityHandle,
  children,
}: {
  communityHandle: Handle;
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  useCommunityQuery({
    name: communityHandle,
    enabled,
  });
  const data = useCommunityFromStore(communityHandle);

  const community = data?.communityView;
  const createdAt = community ? dayjs(community.createdAt) : null;

  return (
    <HoverCard onOpenChange={() => setEnabled(true)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="flex flex-col gap-2.5 py-4 flex-1"
      >
        <span className="font-semibold text-sm">{community?.handle}</span>

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
            communityHandle={communityHandle}
            className="mt-1.5"
          />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
