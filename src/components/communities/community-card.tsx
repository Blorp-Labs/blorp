import { abbriviateNumber } from "@/src/lib/format";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { Link } from "@/src/routing/index";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/src/components/ui/button";
import { useReportError } from "@/src/components/use-report-error";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Account } from "@/src/stores/auth";
import { useShouldBlurNsfw } from "@/src/hooks/nsfw";
import { COMMUNITY_NSFW_ICON_BLUR_CLASS } from "./utils";
import { useCommunityFromStore } from "@/src/stores/communities";
import _ from "lodash";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { Handle, parseHandle } from "@/src/lib/handle";
import { Schemas } from "@/src/apis/api-blueprint";
import { CommunityJoinButton } from "./community-join-button";
import { ABOVE_LINK_OVERLAY } from "@/src/components/posts/config";

type CommunityCardProps = {
  communityHandle: Handle;
  disableLink?: boolean;
  className?: string;
  hideText?: boolean;
  size?: "sm" | "md";
  account?: Account;
  showJoin?: boolean;
};

interface CommunityCardViewProps {
  community: Schemas.Community | undefined;
  disableLink?: boolean;
  className?: string;
  hideText?: boolean;
  size?: "sm" | "md";
  showJoin?: boolean;
}

export function CommunityCardView({
  community: communityView,
  disableLink,
  className,
  hideText,
  size = "md",
  showJoin,
}: CommunityCardViewProps) {
  const blurNsfw = useShouldBlurNsfw();

  // TODO: FIX THIS
  const linkCtx = useLinkContext();

  if (!communityView) {
    return <CommunityCardSkeleton size={size} />;
  }

  const { name, host } = parseHandle(communityView.handle);

  const avatar = (
    <Avatar className={cn("h-9 w-9", size === "sm" && "h-8 w-8")}>
      <AvatarImage
        src={communityView.icon ?? undefined}
        className={cn(
          "object-cover absolute inset-0",
          communityView.nsfw && blurNsfw && COMMUNITY_NSFW_ICON_BLUR_CLASS,
        )}
      />
      <AvatarFallback>{communityView.handle.substring(0, 1)}</AvatarFallback>
    </Avatar>
  );

  const titleNode = (
    <>
      {name}
      <span className="text-muted-foreground italic">@{host}</span>
    </>
  );

  const subscriberCount = _.isNumber(communityView.subscriberCount) &&
    size === "md" && (
      <span className="text-xs text-muted-foreground">
        {abbriviateNumber(communityView.subscriberCount)} members
      </span>
    );

  const joinButton = showJoin && (
    <CommunityJoinButton
      communityHandle={communityView.handle}
      size="xs"
      variant="outline"
      className={ABOVE_LINK_OVERLAY}
    />
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
        {avatar}
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
            {titleNode}
          </span>
          {subscriberCount}
        </div>
        {joinButton}
      </div>
    );
  }

  return (
    <div
      data-testid="community-card"
      className={cn(
        "flex flex-row gap-2 items-center flex-shrink-0 h-12 max-w-full text-foreground relative",
        size === "sm" && "h-9",
        className,
      )}
    >
      {avatar}
      <div
        className={cn(
          "flex flex-col gap-0.5 flex-1 overflow-hidden text-left",
          hideText && "sr-only",
        )}
      >
        <Link
          to={`${linkCtx.root}c/:communityHandle`}
          params={{
            communityHandle: communityView.handle,
          }}
          className="after:absolute after:inset-0 after:content-[''] after:z-[1]"
        >
          <span
            className={cn(
              "text-sm overflow-hidden overflow-ellipsis hover:underline block",
              size === "sm" && "text-xs",
              ABOVE_LINK_OVERLAY,
            )}
          >
            {titleNode}
          </span>
        </Link>
        {subscriberCount}
      </div>
      {joinButton}
    </div>
  );
}

function CommunityCardInner({
  communityHandle,
  disableLink,
  className,
  hideText,
  size = "md",
  account,
  showJoin,
}: CommunityCardProps) {
  const fromRecent = useRecentCommunitiesStore((s) => {
    return s.recentlyVisited.find((r) => r.handle === communityHandle);
  });
  const fromCommunityCache = useCommunityFromStore(communityHandle, account);
  const communityView = fromCommunityCache?.communityView ?? fromRecent;

  return (
    <CommunityCardView
      community={communityView}
      disableLink={disableLink}
      className={className}
      hideText={hideText}
      size={size}
      showJoin={showJoin}
    />
  );
}

function CommunityCardErrorFallback({
  communityHandle,
  error,
}: {
  communityHandle: string;
  error: unknown;
}) {
  const { isLoggedIn, issueUrl, reportViaCommunity } = useReportError({
    contextFields: { "Community Handle": communityHandle },
    reportTitle: "[Crash] Community card rendering error",
    error,
  });

  return (
    <div className="p-2 text-sm flex flex-col gap-2 bg-destructive/20 rounded">
      <p className="font-medium text-destructive text-xs">
        Failed to render community
      </p>
      <span className="text-xs text-muted-foreground break-all">
        {communityHandle}
      </span>
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          size="sm"
          variant={isLoggedIn ? "destructive" : "link"}
          onClick={reportViaCommunity}
        >
          Report in App
        </Button>
        <Button size="sm" variant={isLoggedIn ? "link" : "destructive"} asChild>
          <a href={issueUrl} target="_blank" rel="noopener noreferrer">
            Report on GitHub
          </a>
        </Button>
      </div>
    </div>
  );
}

export function CommunityCard(props: CommunityCardProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <CommunityCardErrorFallback
          communityHandle={props.communityHandle}
          error={error}
        />
      )}
      resetKeys={[props.communityHandle]}
    >
      <CommunityCardInner {...props} />
    </ErrorBoundary>
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
