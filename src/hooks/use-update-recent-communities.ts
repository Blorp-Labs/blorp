import { useEffect } from "react";
import { useRecentCommunitiesStore } from "../stores/recent-communities";
import { useIsActiveRoute } from "./navigation-hooks";
import { Schemas } from "../apis/api-blueprint";
import { useAuth } from "../stores/auth";

export function useUpdateRecentCommunity(communityView?: Schemas.Community) {
  const isActive = useIsActiveRoute();
  const accountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const updateRecent = useRecentCommunitiesStore((s) => s.update);
  useEffect(() => {
    if (isActive && communityView) {
      updateRecent(communityView, accountUuid);
    }
  }, [isActive, updateRecent, communityView, accountUuid]);
}
