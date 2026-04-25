import _ from "lodash";
import { isNotNil } from "./utils";

export type CommentKey = number;

type CommentTreeMeta = {
  pageCursor?: string | number;
  immediateChildren: number;
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
  comment: undefined;
  meta: undefined;
  children: Record<CommentKey, CommentTree>;
}

const getEmptyCommentTree = () => {
  return {
    comment: undefined,
    meta: undefined,
    children: {},
  } satisfies CommentTreeTopLevel;
};

export function getCommentDepth(path: string): number {
  let depth = -1;
  for (let i = 0; i < path.length; i++) {
    if (path[i] === ".") {
      depth++;
    }
  }
  return depth;
}

export function shouldShowMore(node: CommentTree): boolean {
  return (
    node.meta.pruned ||
    _.keys(node.children).length < node.meta.immediateChildren
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
): CommentTree | CommentTreeTopLevel {
  const { maxDepth = 6, getCommentPageCursor } = context;

  const map: CommentTreeTopLevel = getEmptyCommentTree();

  const commentPathStr = context.commentPath;
  const commentPath = commentPathStr?.split(".");
  const firstCommentInPath = commentPath?.[0];

  let i = 0;

  for (const view of _.uniqBy(commentViews, (c) => c.id)) {
    let loc: CommentTreeTopLevel | CommentTree = map;

    let viewPath = view.path;

    if (firstCommentInPath && viewPath.indexOf(firstCommentInPath) > -1) {
      viewPath =
        "0." + viewPath.substring(viewPath.indexOf(firstCommentInPath));
    }

    // TODO: what does this do? Optimization?
    if (commentPathStr && viewPath.length > commentPathStr.length) {
      if (viewPath.indexOf(commentPathStr) === -1) {
        continue;
      }
    }

    const [_, ...path] = viewPath.split(".");
    const relativePathLength = commentPath
      ? path.length - commentPath.length
      : path.length;
    if (relativePathLength > maxDepth) {
      continue;
    }

    while (path.length > 1) {
      const front: CommentKey = +path.shift()!;
      loc.children[front] = loc.children[front] ?? {
        meta: {
          sort: 0,
          immediateChildren: 0,
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
        immediateChildren: 0,
        pruned: false,
        pageCursor: getCommentPageCursor?.(view),
      },
    };
    i++;
  }

  countImnediateChildre(map);

  const out = pruneCommentTree(map);
  if (context.commentPath) {
    return getNodeAtPath(map, context.commentPath) ?? getEmptyCommentTree();
  }
  return out;
}

function getNodeAtPath(
  tree: CommentTreeTopLevel | CommentTree,
  pathStr: string,
) {
  const path = pathStr.split(".").map(Number);
  while (path.length >= 2) {
    const edge = path.shift();
    const child = isNotNil(edge) ? tree.children[edge] : undefined;
    if (!child) {
      return undefined;
    }
    tree = child;
  }
  const edge = path.shift();
  const child = isNotNil(edge) ? tree.children[edge] : undefined;

  if (isNotNil(edge)) {
    return {
      ...tree,
      children: child
        ? {
            [edge]: child,
          }
        : {},
    };
  }

  return tree;
}

function pruneCommentTree(tree: CommentTreeTopLevel): CommentTreeTopLevel {
  /**
   *
   */
  function pruneNode(
    node: CommentTree,
    rootCursor: string | number,
  ): undefined | "pruning" | "done" {
    const pageCursor = node.meta.pageCursor;
    if (node.comment && _.isNil(pageCursor)) {
      return "done";
    }

    // Breath First Search
    // Scan children eagerly
    const childComments = getCommentChildren(node);
    const results = childComments.map(([_, child]) =>
      pruneNode(child, rootCursor),
    );

    // We have to scan the children one more time
    // to see if node needs to be pruned
    for (const key of getCommentChildrenKeys(node)) {
      const childCursor = node.children[key]?.meta.pageCursor;
      if (isNotNil(childCursor) && childCursor !== rootCursor) {
        node.meta.pruned = true;
        delete node.children[key];
      }
    }

    // If any of the children hit a stop case
    // return done to prevent any further pruning
    if (results.includes("done")) {
      // Return early to prevent further pruning
      return "done";
    }

    // If any of the children were pruning, and
    // the current node matches the root node's cursor,
    // stop pruning to prevent node from being clipped
    // off further up the tree
    if (results.includes("pruning")) {
      // Return early to prevent further pruning
      return pageCursor === rootCursor ? "done" : "pruning";
    }

    return node.meta.pruned ? "pruning" : undefined;
  }

  for (const key of getCommentChildrenKeys(tree)) {
    const node = tree.children[key];
    if (node && node.meta.pageCursor) {
      pruneNode(node, node.meta.pageCursor);
    }
  }

  return tree;
}

function countImnediateChildre(node: CommentTree | CommentTreeTopLevel) {
  const children = _.values(node.children);
  for (const child of children) {
    countImnediateChildre(child);
  }
  if ("comment" in node && node.comment) {
    node.meta.immediateChildren = node.comment.childCount;
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
