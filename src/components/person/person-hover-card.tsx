import { usePersonDetails } from "@/src/lib/api/index";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { LuCakeSlice } from "react-icons/lu";
import { Skeleton } from "../ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { MouseEvent, useState } from "react";
import { useProfileFromStore } from "@/src/stores/profiles";
import { AggregateBadges } from "../aggregates";
import { DateTime } from "../datetime";
import { PersonBadge } from "./person-badge";
import { HoverCardContentProps } from "@radix-ui/react-hover-card";
import { useHistory } from "@/src/routing";

dayjs.extend(localizedFormat);

export function PersonHoverCard({
  actorId,
  children,
  asChild,
  align = "start",
}: {
  actorId: string;
  children: React.ReactNode;
  asChild?: boolean;
  align?: HoverCardContentProps["align"];
}) {
  const [enabled, setEnabled] = useState(false);
  const { push } = useHistory();

  usePersonDetails({ actorId, enabled });
  const personView = useProfileFromStore(actorId);
  const createdAt = personView ? dayjs(personView.createdAt) : null;
  const href = personView ? `/u/${personView.slug}` : undefined;

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
        align={align}
        className="flex flex-col gap-3 py-4 flex-1 w-72"
      >
        <div className="font-bold text-sm h-5">
          {personView?.slug ?? <Skeleton className="w-2/3 h-full" />}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <LuCakeSlice />
          <span>
            Joined <DateTime date={createdAt} />
          </span>
        </div>

        <AggregateBadges
          className="mt-1"
          aggregates={{
            Posts: personView?.postCount,
            Comments: personView?.commentCount,
          }}
        >
          <PersonBadge person={personView} />
        </AggregateBadges>
      </HoverCardContent>
    </HoverCard>
  );
}
