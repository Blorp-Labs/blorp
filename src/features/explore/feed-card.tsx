import { Link } from "@/src/routing/index";
import { Schemas } from "../../lib/api/adapters/api-blueprint";
import _ from "lodash";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { cn } from "../../lib/utils";
import { abbriviateNumber } from "../../lib/format";
import { useLinkContext } from "../../routing/link-context";
import { removeMd } from "../../components/markdown/remove-md";
import { encodeApId } from "../../lib/api/utils";

export const FEEDS = "FEEDS";

export function FeedCard({
  icon,
  name,
  communityCount,
  slug,
  apId,
  description,
  className,
  expand,
}: Schemas.Feed & {
  className?: string;
  expand: boolean;
}) {
  const ctx = useLinkContext();
  const host = slug?.split("@")?.[1];
  return (
    <Link
      className={cn("flex flex-col gap-2", className)}
      to={`${ctx.root}f/:apId`}
      params={{
        apId: encodeApId(apId),
      }}
    >
      <div className="flex flex-row gap-2 items-center flex-shrink-0 max-w-full text-foreground">
        <Avatar className="h-9 w-9">
          <AvatarImage
            src={icon ?? undefined}
            className="object-cover absolute inset-0"
          />
          <AvatarFallback>{name.substring(0, 1)}</AvatarFallback>
        </Avatar>

        <div
          className={cn(
            "flex flex-col gap-0.5 flex-1 overflow-hidden text-left",
          )}
        >
          <span className={cn("text-sm overflow-hidden overflow-ellipsis")}>
            {name}
            <span className="text-muted-foreground italic">@{host}</span>
          </span>
          {_.isNumber(communityCount) && (
            <span className="text-xs text-muted-foreground">
              {abbriviateNumber(communityCount)} communities
            </span>
          )}
        </div>
      </div>

      {expand && (
        <div className="flex flex-row overflow-hidden">
          {description && (
            <p className="line-clamp-2 -mt-1 text-xs text-muted-foreground">
              {removeMd(description)}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
