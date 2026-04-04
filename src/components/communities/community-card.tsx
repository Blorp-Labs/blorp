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
import { Account } from "@/src/stores/auth";
import { useNsfwVisibility } from "@/src/lib/nsfw";
import { COMMUNITY_NSFW_ICON_BLUR_CLASS } from "./utils";
import { useCommunityFromStore } from "@/src/stores/communities";
import _ from "lodash";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";

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
  const fromRecent = useRecentCommunitiesStore((s) => {
    return s.recentlyVisited.find((r) => r.slug === communitySlug);
  });
  const fromCommunityCache = useCommunityFromStore(communitySlug, account);
  const communityView = fromCommunityCache?.communityView ?? fromRecent;

  const blurNsfw = useNsfwVisibility() === "blur";

  // TODO: FIX THIS
  const linkCtx = useLinkContext();

  if (!communityView) {
    return <CommunityCardSkeleton size={size} />;
  }

  const [name, host] = communityView.slug.split("@");

  const content = (
    <>
      <Avatar className={cn("h-9 w-9", size === "sm" && "h-8 w-8")}>
        <AvatarImage
          src={communityView.icon ?? undefined}
          className={cn(
            "object-cover absolute inset-0",
            communityView.nsfw && blurNsfw && COMMUNITY_NSFW_ICON_BLUR_CLASS,
          )}
        />
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
        size === "sm" && "h-9",
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
