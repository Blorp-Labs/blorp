import _ from "lodash";

export type CommentKey = number;

type CommentTreeMeta = {
  pageCursor?: string | number;
  imediateChildren: number;
  sort: number;
  pruned: boolean;
};

type CommentTreeComment = {
  id: number;
  postApId: string;
  childCount: number;
  path: string;
};

export interface CommentTree {
  comment?: CommentTreeComment;
  meta: CommentTreeMeta;
  children: Record<CommentKey, CommentTree>;
}

export interface CommentTreeTopLevel {
  children: Record<CommentKey, CommentTree>;
}

export function shouldShowMore(node: CommentTree): boolean {
  return (
    node.meta.pruned ||
    _.keys(node.children).length < node.meta.imediateChildren
  );
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
  }[],
  context: {
    commentPath?: string;
    maxDepth?: number;
    getCommentPageCursor?: (
      comment: CommentTreeComment,
    ) => number | string | undefined;
  },
) {
  const { maxDepth = 6, commentPath } = context;

  const map: CommentTreeTopLevel = {
    children: {},
  };

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
      const front: CommentKey = +path.shift()!;
      loc.children[front] = loc.children[front] ?? {
        meta: {
          sort: 0,
          imediateChildren: 0,
          pruned: false,
        },
        children: {},
      };
      loc = loc.children[front];
    }

    const front: CommentKey = +path.shift()!;

    loc.children[front] = {
      children: {},
      ...loc.children[front],
      comment: view,
      meta: {
        ...loc.children[front]?.meta,
        sort: i,
        imediateChildren: 0,
        pruned: false,
      },
    };
    i++;
  }

  countImediateChildre(map);

  return pruneCommentTree(map);
}

function pruneCommentTree(tree: CommentTreeTopLevel): CommentTreeTopLevel {
  function pruneNode(node: CommentTree) {
    const pageCursor = node.meta.pageCursor;
    if (_.isNil(pageCursor)) {
      return;
    }

    for (const key of getCommentChildrenKeys(node)) {
      const child = node.children[key];
      const childPageCursor = child?.meta.pageCursor;
      if (!_.isNil(childPageCursor) && childPageCursor !== pageCursor) {
        node.meta.pruned = true;
        delete node.children[key];
      } else if (child) {
        pruneNode(child);
      }
    }
  }

  for (const key of getCommentChildrenKeys(tree)) {
    const node = tree.children[key];
    if (node) {
      pruneNode(node);
    }
  }

  return tree;
}

function countImediateChildre(node: CommentTree | CommentTreeTopLevel) {
  const children = _.values(node.children);
  let grandChildren = 0;
  for (const child of children) {
    if (child.comment) {
      grandChildren += child.comment.childCount;
    }
    countImediateChildre(child);
  }
  if ("comment" in node && node.comment) {
    node.meta.imediateChildren = node.comment.childCount - grandChildren;
  }
}

function getCommentChildrenKeys(
  node: CommentTree | CommentTreeTopLevel,
): CommentKey[] {
  return _.keys(node.children).map(Number);
}

export function getCommentChildren(
  node: CommentTree | CommentTreeTopLevel,
): (readonly [CommentKey, CommentTree])[] {
  const keys = getCommentChildrenKeys(node);
  const comments = _.compact(
    keys.map((key) =>
      node.children[key] ? ([key, node.children[key]] as const) : undefined,
    ),
  );
  return comments.sort(([_id1, a], [_id2, b]) => a.meta.sort - b.meta.sort);
}
