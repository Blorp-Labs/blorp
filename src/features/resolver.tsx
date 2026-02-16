import { useEffect } from "react";
import NotFound from "./not-found";
import { useHistory, useLocation } from "react-router";
import { useResolveObject } from "../lib/api";
import { resolveRoute } from "../routing";
import { encodeApId } from "../lib/api/utils";

const origin = (() => {
  try {
    // Blorp is often hosted on a sub comain,
    // so we extract the root domain.
    const host = location.host.split(".");
    return location.protocol + "//" + host.slice(-2).join(".");
  } catch {
    return "";
  }
})();

export default function ApResolver() {
  const location = useLocation();
  const { replace } = useHistory();
  const apId = origin + location.pathname;

  const resolveQuery = useResolveObject(apId);
  const { data } = resolveQuery;

  useEffect(() => {
    const { post, community, user } = data ?? {};

    if (post) {
      replace(
        resolveRoute("/home/c/:communityName/posts/:post", {
          post: encodeApId(post.apId),
          communityName: post.communitySlug,
        }),
      );
    } else if (community) {
      replace(
        resolveRoute("/home/c/:communityName", {
          communityName: community.slug,
        }),
      );
    } else if (user) {
      replace(
        resolveRoute("/home/u/:userId", {
          userId: encodeApId(user.apId),
        }),
      );
    }
  }, [replace, data?.post, data?.community, data?.user]);

  const notFoundApId =
    resolveQuery.isError ||
    (resolveQuery.isSuccess && !data?.post && !data?.community && !data?.user)
      ? apId
      : undefined;

  return <NotFound apId={notFoundApId} />;
}
