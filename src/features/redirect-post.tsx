import { useEffect } from "react";
import { useHistory } from "react-router";
import { resolveRoute, useParams } from "@/src/routing/index";
import { useLinkContext } from "@/src/hooks/navigation-hooks";

export default function RedirectPost() {
  const linkCtx = useLinkContext();
  const { post, comment } = useParams(
    `${linkCtx.root}c/:communityHandle/posts/:post/comments/:comment`,
  );
  const { replace } = useHistory();

  useEffect(() => {
    if (!post) {
      return;
    }
    replace(
      comment
        ? resolveRoute(`${linkCtx.root}posts/:post/comments/:comment`, {
            post,
            comment,
          })
        : resolveRoute(`${linkCtx.root}posts/:post`, { post }),
    );
  }, [replace, post, comment, linkCtx.root]);

  return null;
}
