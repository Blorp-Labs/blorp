import { useEffect } from "react";
import { useRecentPostsStore } from "../stores/recent-posts";
import { useIsActiveRoute } from "./navigation-hooks";
import { Schemas } from "../apis/api-blueprint";
import { useAuth } from "../stores/auth";

export function useUpdateRecentPost(
  post?: Schemas.Post,
  community?: Schemas.Community,
  creator?: Schemas.Person,
) {
  const isActive = useIsActiveRoute();
  const accountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const update = useRecentPostsStore((s) => s.update);
  useEffect(() => {
    if (isActive && post && community && creator) {
      update({
        apId: post.apId,
        accountUuid,
        post,
        community,
        creator,
      });
    }
  }, [isActive, accountUuid, post, community, creator, update]);
}
