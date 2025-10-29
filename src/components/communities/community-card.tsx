import { abbriviateNumber } from "@/src/lib/format";
import { useLinkContext } from "@/src/routing/link-context";
import { Link } from "@/src/routing/index";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Account, useAuth } from "@/src/stores/auth";
import { useCommunitiesStore } from "@/src/stores/communities";
import _ from "lodash";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { useEffect, useRef } from "react";

export function CommunityCard({
  communitySlug,
  disableLink,
  className,
  hideText,
  size = "md",
  account,
}: {
  communitySlug: string;
  disableLink?: boolean;
  className?: string;
  hideText?: boolean;
  size?: "sm" | "md";
  account?: Account;
}) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const fromRecent = useRecentCommunitiesStore((s) => {
    return s.recentlyVisited.find((r) => r.slug === communitySlug);
  });
  const fromCommunityCache = useCommunitiesStore((s) => {
    return s.communities[getCachePrefixer(account)(communitySlug)]?.data;
  });
  const communityView = fromCommunityCache?.communityView ?? fromRecent;

  // TODO: FIX THIS
  const linkCtx = useLinkContext();

  const prevIcon = useRef(communityView?.icon);
  useEffect(() => {
    prevIcon.current = communityView?.icon;
  }, [communityView?.icon]);

  if (!communityView) {
    return <CommunityCardSkeleton size={size} />;
  }

  const [name, host] = communityView.slug.split("@");

  const content = (
    <>
      <Avatar className={cn("h-9 w-9", size === "sm" && "h-8 w-8")}>
        <AvatarImage
          src={communityView.icon ?? undefined}
          className="object-cover"
        />
        {prevIcon.current && prevIcon.current !== communityView.icon && (
          <AvatarImage src={prevIcon.current} className="object-cover" />
        )}
        <AvatarFallback>{communityView.slug.substring(0, 1)}</AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-0.5 flex-1 overflow-hidden text-left",
          hideText && "sr-only",
        )}
      >
        <span
          className={cn(
            "text-sm overflow-hidden overflow-ellipsis",
            size === "sm" && "text-xs",
          )}
        >
          {name}
          <span className="text-muted-foreground italic">@{host}</span>
        </span>
        {_.isNumber(communityView.subscriberCount) && size === "md" && (
          <span className="text-xs text-muted-foreground">
            {abbriviateNumber(communityView.subscriberCount)} members
          </span>
        )}
      </div>
    </>
  );

  if (disableLink) {
    return (
      <div
        data-testid="community-card"
        className={cn(
          "flex flex-row gap-2 items-center flex-shrink-0 h-12 text-foreground",
          size === "sm" && "h-9",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      data-testid="community-card"
      to={`${linkCtx.root}c/:communityName`}
      params={{
        communityName: communityView.slug,
      }}
      className={cn(
        "flex flex-row gap-2 items-center flex-shrink-0 h-12 max-w-full text-foreground",
        size === "sm" && "h-9",
        className,
      )}
    >
      {content}
    </Link>
  );
}

export function CommunityCardSkeleton({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex flex-row gap-2 items-center flex-shrink-0 h-12",
        className,
      )}
    >
      <Skeleton
        className={cn("h-9 w-9 rounded-full", size === "sm" && "h-8 w-8")}
      />

      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-32" />
        {size !== "sm" && <Skeleton className="h-3 w-44" />}
      </div>
    </div>
  );
}
