import { Link } from "@/src/routing/index";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Account, useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { encodeApId } from "@/src/lib/api/utils";
import { useLinkContext } from "../../routing/link-context";
import { PersonHoverCard } from "./person-hover-card";
import _ from "lodash";
import { abbriviateNumber } from "@/src/lib/format";

export function PersonCard({
  actorId,
  size = "md",
  className,
  disableLink,
  disableHover,
  showCounts,
  account,
}: {
  actorId: string;
  size?: "sm" | "md";
  className?: string;
  disableLink?: boolean;
  disableHover?: boolean;
  showCounts?: boolean;
  account?: Account;
}) {
  const linkCtx = useLinkContext();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const p = useProfilesStore((s) =>
    actorId ? s.profiles[getCachePrefixer(account)(actorId)]?.data : undefined,
  );

  if (!p) {
    return <PersonSkeletonCard size={size} className={className} />;
  }

  const [name, host] = p?.slug.split("@") ?? [];

  const content = (
    <>
      <Avatar className={cn("h-9 w-9", size === "sm" && "h-8 w-8")}>
        <AvatarImage src={p?.avatar ?? undefined} className="object-cover" />
        <AvatarFallback>{p?.slug?.substring(0, 1)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <span
          className={cn(
            "text-sm overflow-hidden overflow-ellipsis",
            size === "sm" && "text-xs",
          )}
        >
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
          "flex flex-row gap-2 items-center flex-shrink-0 h-12 max-w-full text-foreground",
          size === "sm" && "h-9",
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
        "flex flex-row gap-2 items-center flex-shrink-0 h-12 max-w-full text-foreground",
        size === "sm" && "h-9",
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

function PersonSkeletonCard({
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
      </div>
    </div>
  );
}
