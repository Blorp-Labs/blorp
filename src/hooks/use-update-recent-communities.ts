import { useEffect } from "react";
import { useRecentCommunitiesStore } from "../stores/recent-communities";
import { useIsActiveRoute } from "./navigation-hooks";
import { Schemas } from "../apis/api-blueprint";

export function useUpdateRecentCommunity(communityView?: Schemas.Community) {
  const isActive = useIsActiveRoute();
  const updateRecent = useRecentCommunitiesStore((s) => s.update);
  useEffect(() => {
    if (isActive && communityView) {
      updateRecent(communityView);
    }
  }, [isActive, updateRecent, communityView]);
}
