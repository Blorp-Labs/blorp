import _ from "lodash";

const DATA_KEYS = ["sort", "comment", "imediateChildren", "pruned"] as const;

export interface CommentTree {
  comment?: {
    id: number;
    postApId: string;
    childCount: number;
    path: string;
    pageCursor?: string | number;
  };
  imediateChildren: number;
  sort: number;
  pruned: boolean;
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
    postApId: string;
    childCount: number;
    path: string;
    pageCursor: string | number;
  }[],
  commentPath?: string,
  maxDepth = 6,
) {
  const map: CommentTreeTopLevel = {};

  const firstCommentInPath = commentPath?.split(".")?.[0];

  let i = 0;

  for (const view of _.uniqBy(commentViews, (c) => c.id)) {
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
        pruned: false,
      };
      loc = loc[front];
    }

    const front: keyof typeof loc = path.shift()! as any;

    const parentPageCursor =
      "comment" in loc && loc.comment ? loc.comment.pageCursor : undefined;
    if (
      parentPageCursor !== undefined &&
      parentPageCursor !== view.pageCursor
    ) {
      (loc as CommentTree).pruned = true;
    }

    loc[front] = {
      ...loc[front],
      sort: i,
      comment: view,
      imediateChildren: 0,
      pruned: false,
    };
    i++;
  }

  countImediateChildre(map);

  return pruneCommentTree(map);
}

function pruneCommentTree(tree: CommentTreeTopLevel): CommentTreeTopLevel {
  function pruneNode(node: CommentTree) {
    if (node.pruned) {
      for (const key in node) {
        if (!DATA_KEYS.includes(key as any)) {
          delete node[key];
        }
      }
    }
  }

  for (const key in tree) {
    const node = tree[key];
    if (node) {
      pruneNode(node);
    }
  }

  return tree;
}

function countImediateChildre(node: CommentTree | CommentTreeTopLevel) {
  const children = _.values(_.omit(node as CommentTree, DATA_KEYS));
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
