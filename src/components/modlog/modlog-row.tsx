import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { PersonHoverCard } from "@/src/components/person/person-hover-card";
import { Link } from "@/src/routing/index";
import { useLinkContext } from "@/src/routing/link-context";
import { encodeApId } from "@/src/lib/api/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { RelativeTime } from "../relative-time";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

function actionTypeLabel(actionType: string): string {
  switch (actionType) {
    case "removed_post":
      return "Removed post";
    case "locked_post":
      return "Locked post";
    case "featured_post":
      return "Featured post";
    case "removed_comment":
      return "Removed comment";
    case "removed_community":
      return "Removed community";
    case "banned_from_community":
      return "Banned from community";
    case "banned":
      return "Site banned";
    case "added_to_community":
      return "Added as mod";
    case "transferred_to_community":
      return "Transferred community";
    case "added_admin":
      return "Added as admin";
    case "admin_purged_person":
      return "Purged person";
    case "admin_purged_community":
      return "Purged community";
    case "admin_purged_post":
      return "Purged post";
    case "admin_purged_comment":
      return "Purged comment";
    case "hidden_community":
      return "Hidden community";
    default:
      return actionType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function ModlogRow({ item }: { item: Schemas.ModlogItem }) {
  const linkCtx = useLinkContext();

  return (
    <div className="flex flex-row items-start gap-2 px-3 py-2 border-b border-border text-sm min-h-14">
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
