import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { PersonHoverCard } from "@/src/components/person/person-hover-card";
import { Link } from "@/src/routing/index";
import { useLinkContext } from "@/src/routing/link-context";
import { encodeApId } from "@/src/lib/api/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { RelativeTime } from "../relative-time";
import { ContentGutters } from "../gutters";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "../ui/skeleton";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const ACTION_LABELS: Record<string, string> = {
  banned: "Site banned",
  added_to_community: "Added as mod",
  transferred_to_community: "Transferred community",
  added_admin: "Added as admin",
  admin_purged_person: "Purged person",
  admin_purged_community: "Purged community",
  admin_purged_post: "Purged post",
  admin_purged_comment: "Purged comment",
};

function actionTypeLabel(actionType: string): string {
  return (
    ACTION_LABELS[actionType] ??
    actionType.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

export function ModlogRow({ item }: { item: Schemas.ModlogItem }) {
  const linkCtx = useLinkContext();

  return (
    <div
      className={cn(
        "flex flex-row items-start gap-2 py-2 border-b border-border text-sm min-h-14",
        ContentGutters.mobilePadding,
      )}
    >
      {/* Time column */}
      <div className="w-12 shrink-0 text-muted-foreground text-xs pt-0.5">
        <RelativeTime time={item.createdAt} />
      </div>

      {/* Mod column */}
      <div className="w-28 shrink-0 overflow-hidden">
        {item.modApId ? (
          <PersonHoverCard actorId={item.modApId} asChild>
            <Link
              to={`${linkCtx.root}u/:userId`}
              params={{ userId: encodeApId(item.modApId) }}
              className="text-brand truncate block"
            >
              {item.modSlug?.split("@")[0] ?? item.modSlug}
            </Link>
          </PersonHoverCard>
        ) : (
          <span className="text-muted-foreground italic">unknown</span>
        )}
      </div>

      {/* Action column */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium">
            {actionTypeLabel(item.actionType)}
          </span>
          {item.userApId && (
            <>
              <span className="text-muted-foreground">→</span>
              <PersonHoverCard actorId={item.userApId} asChild>
                <Link
                  to={`${linkCtx.root}u/:userId`}
                  params={{ userId: encodeApId(item.userApId) }}
                  className="text-brand"
                >
                  {item.userSlug?.split("@")[0] ?? item.userSlug}
                </Link>
              </PersonHoverCard>
            </>
          )}
          {item.postApId && item.postTitle && (
            <Link
              to={`${linkCtx.root}c/:communityName/posts/:post`}
              params={{
                communityName: item.communitySlug ?? "",
                post: encodeURIComponent(item.postApId),
              }}
              className="text-brand truncate max-w-xs"
            >
              {item.postTitle}
            </Link>
          )}
          {item.commentId && item.postApId && item.communitySlug && (
            <Link
              to={`${linkCtx.root}c/:communityName/posts/:post`}
              params={{
                communityName: item.communitySlug,
                post: encodeURIComponent(item.postApId),
              }}
              className="text-brand"
            >
              comment
            </Link>
          )}
        </div>
        {item.reason && (
          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
            {item.reason}
          </p>
        )}
      </div>
    </div>
  );
}

export function ModlogRowSkeleton() {
  return (
    <ContentGutters noMobilePadding>
      <div
        className={cn(
          "flex flex-row items-stretch gap-2 py-2 border-b border-border text-sm min-h-14",
          ContentGutters.mobilePadding,
        )}
      >
        <Skeleton className="w-12" />
        <Skeleton className="w-28" />
        <Skeleton className="flex-1" />
      </div>
      <></>
    </ContentGutters>
  );
}
