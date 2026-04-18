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
import { useProfileFromStore } from "@/src/stores/profiles";
import { encodeApId, parseHandle } from "@/src/apis/utils";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { PersonHoverCard } from "./person-hover-card";
import _ from "lodash";
import { abbriviateNumber } from "@/src/lib/format";

type PersonCardProps = {
  actorId: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  disableLink?: boolean;
  disableHover?: boolean;
  showCounts?: boolean;
  account?: Account;
};

function PersonCardInner({
  actorId,
  size = "md",
  className,
  disableLink,
  disableHover,
  showCounts,
  account,
}: PersonCardProps) {
  const linkCtx = useLinkContext();
  const p = useProfileFromStore(actorId, account);

  if (!p) {
    return <PersonSkeletonCard size={size} className={className} />;
  }

  const { name, host } = parseHandle(p.handle);

  const content = (
    <>
      <Avatar
        className={cn(
          "h-9 w-9",
          size === "sm" && "h-8 w-8",
          size === "xs" && "h-6 w-6",
        )}
      >
        <AvatarImage src={p?.avatar ?? undefined} className="object-cover" />
        <AvatarFallback>{p?.handle?.substring(0, 1)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col min-w-0">
        <span className={cn("text-sm truncate", size === "sm" && "text-xs")}>
          {name}
          <span className="text-muted-foreground italic">@{host}</span>
        </span>
        {showCounts && (
          <div className="flex flex-row gap-1">
            {_.isNumber(p?.postCount) && size === "md" && (
              <span className="text-xs text-muted-foreground">
                {abbriviateNumber(p.postCount)} posts
                {_.isNumber(p?.commentCount) ? "," : ""}
              </span>
            )}

            {_.isNumber(p?.commentCount) && size === "md" && (
              <span className="text-xs text-muted-foreground">
                {abbriviateNumber(p.commentCount)} comments
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (disableLink) {
    const noLinkContent = (
      <div
        data-testid="person-card"
        className={cn(
          "flex flex-row gap-2 items-center min-w-0 h-12 text-foreground",
          size === "sm" && "h-9",
          size === "xs" && "h-6",
          className,
        )}
      >
        {content}
      </div>
    );

    return disableHover ? (
      noLinkContent
    ) : (
      <PersonHoverCard actorId={actorId}>{noLinkContent}</PersonHoverCard>
    );
  }

  const withLinkContent = (
    <Link
      data-testid="person-card"
      to={`${linkCtx.root}u/:userId`}
      params={{
        userId: encodeApId(actorId),
      }}
      className={cn(
        "flex flex-row gap-2 items-center min-w-0 h-12 text-foreground",
        size === "sm" && "h-9",
        size === "xs" && "h-6",
        className,
      )}
    >
      {content}
    </Link>
  );

  return disableHover ? (
    withLinkContent
  ) : (
    <PersonHoverCard actorId={actorId} asChild>
      {withLinkContent}
    </PersonHoverCard>
  );
}

function PersonCardErrorFallback({
  actorId,
  error,
}: {
  actorId: string;
  error: unknown;
}) {
  const { isLoggedIn, issueUrl, reportViaCommunity } = useReportError({
    contextFields: { "Person actorId": actorId },
    reportTitle: "[Crash] Person card rendering error",
    error,
  });

  return (
    <div className="p-2 text-sm flex flex-col gap-2 bg-destructive/20 rounded">
      <p className="font-medium text-destructive text-xs">
        Failed to render person
      </p>
      <span className="text-xs text-muted-foreground break-all">{actorId}</span>
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

export function PersonCard(props: PersonCardProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <PersonCardErrorFallback actorId={props.actorId} error={error} />
      )}
      resetKeys={[props.actorId]}
    >
      <PersonCardInner {...props} />
    </ErrorBoundary>
  );
}

function PersonSkeletonCard({
  className,
  size = "md",
}: {
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex flex-row gap-2 items-center flex-shrink-0 h-12",
        className,
      )}
    >
      <Skeleton
        className={cn(
          "h-9 w-9 rounded-full",
          size === "sm" && "h-8 w-8",
          size === "xs" && "h-6 w-6",
        )}
      />

      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
