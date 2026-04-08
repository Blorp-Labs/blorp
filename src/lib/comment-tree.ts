import _ from "lodash";

export interface CommentTree {
  comment?: {
    id: number;
    communitySlug: string;
    postApId: string;
    childCount: number;
    path: string;
  };
  imediateChildren: number;
  sort: number;
  [key: number]: CommentTree;
}

export interface CommentTreeTopLevel {
  [key: number]: CommentTree;
}

/**
 * Lemmy returns us an array of comments, but what we really
 * need is a tree where child comments are attached to their
 * parent. We have all the information we need in the list to
 * build this tree. This function transforms the array into a tree.
 *
 * @example
 *   cosnt comments = useCommentsQuery();
 *
 *   const tree = buildCommentTree(comments);
 *
 *   // Render tree recursivly
 */
export function buildCommentTree(
  commentViews: {
    id: number;
    communitySlug: string;
    postApId: string;
    childCount: number;
    path: string;
  }[],
  commentPath?: string,
  maxDepth = 6,
) {
  const map: CommentTreeTopLevel = {};

  const firstCommentInPath = commentPath?.split(".")?.[0];

  let i = 0;

  for (const view of commentViews) {
    let loc: CommentTreeTopLevel | CommentTree = map;

    let viewPath = view.path;

    if (firstCommentInPath && viewPath.indexOf(firstCommentInPath) > -1) {
      viewPath =
        "0." + viewPath.substring(viewPath.indexOf(firstCommentInPath));
    }

    if (commentPath && viewPath.length > commentPath.length) {
      if (viewPath.indexOf(commentPath) === -1) {
        continue;
      }
    }

    const [_, ...path] = viewPath.split(".");
    if (path.length > maxDepth) {
      continue;
    }

    while (path.length > 1) {
      const front = +path.shift()!;
      loc[front] = loc[front] ?? {
        sort: 0,
        imediateChildren: 0,
      };
      loc = loc[front];
    }

    const front: keyof typeof loc = path.shift()! as any;

    loc[front] = {
      ...loc[front],
      sort: i,
      comment: view,
      imediateChildren: 0,
    };
    i++;
  }

  countImediateChildre(map);

  return map;
}

function countImediateChildre(node: CommentTree | CommentTreeTopLevel) {
  const children = _.values(
    _.omit(node as CommentTree, ["sort", "comment", "imediateChildren"]),
  );
  let grandChildren = 0;
  for (const child of children) {
    if (child.comment) {
      grandChildren += child.comment.childCount;
    }
    countImediateChildre(child);
  }
  if ("comment" in node && node.comment) {
    node.imediateChildren = node.comment.childCount - grandChildren;
  }
}
