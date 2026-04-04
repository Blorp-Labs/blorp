import { useCommunity } from "@/src/lib/api/index";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useCommunityFromStore } from "@/src/stores/communities";
import { LuCakeSlice } from "react-icons/lu";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { MouseEvent, useState } from "react";
import { AggregateBadges } from "../aggregates";
import { CommunityJoinButton } from "./community-join-button";
import { DateTime } from "../datetime";
import { useHistory } from "@/src/routing";

dayjs.extend(localizedFormat);

export function CommunityHoverCard({
  communityName,
  children,
  asChild,
}: {
  communityName: string;
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const { push } = useHistory();
  useCommunity({
    name: communityName,
    enabled,
  });
  const data = useCommunityFromStore(communityName);

  const community = data?.communityView;
  const createdAt = community ? dayjs(community.createdAt) : null;
  const href = community ? `/c/${community.slug}` : undefined;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (href) {
      e.preventDefault();
      push(href as never, {} as never);
    }
  };

  const trigger = (
    <a href={href} onClick={handleClick}>
      {children}
    </a>
  );

  return (
    <HoverCard onOpenChange={() => setEnabled(true)}>
      <HoverCardTrigger asChild>{asChild ? children : trigger}</HoverCardTrigger>
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
