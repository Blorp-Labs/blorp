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
import { useState } from "react";
import { useProfilesStore } from "@/src/stores/profiles";
import { useAuth } from "@/src/stores/auth";
import { AggregateBadges } from "../aggregates";
import { DateTime } from "../datetime";

dayjs.extend(localizedFormat);

export function PersonHoverCard({
  actorId,
  children,
  asChild,
}: {
  actorId: string;
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);

  usePersonDetails({ actorId, enabled });
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const personView = useProfilesStore((s) =>
    actorId ? s.profiles[getCachePrefixer()(actorId)]?.data : undefined,
  );
  const createdAt = personView ? dayjs(personView.createdAt) : null;

  return (
    <HoverCard onOpenChange={() => setEnabled(true)}>
      <HoverCardTrigger asChild={asChild}>{children}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="flex flex-col gap-3 py-4 flex-1"
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
        />
      </HoverCardContent>
    </HoverCard>
  );
}
