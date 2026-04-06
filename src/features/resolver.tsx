import { useEffect } from "react";
import { Page } from "../components/page";
import { useHistory, useLocation } from "react-router";
import { useResolveObject } from "../queries";
import { resolveRoute } from "../routing";
import { encodeApId } from "../apis/utils";

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

  const resolveQuery = useResolveObject({ q: apId });
  const { data } = resolveQuery;

  useEffect(() => {
    const { post, community, user, feed } = data ?? {};

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
    } else if (feed) {
      replace(
        resolveRoute("/home/f/:apId", {
          apId: encodeApId(feed.apId),
        }),
      );
    }
  }, [replace, data?.post, data?.community, data?.user, data?.feed]);

  return <Page notFound />;
}
