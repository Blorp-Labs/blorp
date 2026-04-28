import _ from "lodash";
import { isNotNil } from "./utils";

export type CommentKey = number;

type CommentTreeMeta = {
  pageCursor?: string | number;
  immediateChildren: number;
  sort: number;
  pruned: boolean;
  colorIndex: number;
  path?: string;
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

// Returns the path prefix ending at the first occurrence of `id`, e.g.
// pathUpTo(["0","50","100","200"], 100) → "0.50.100"
function pathUpTo(segments: string[], id: number): string | undefined {
  const idx = segments.indexOf(String(id));
  return idx >= 0 ? segments.slice(0, idx + 1).join(".") : undefined;
}

const getEmptyCommentTree = () => {
  return {
    comment: undefined,
    meta: undefined,
    children: {},
  } satisfies CommentTreeTopLevel;
};

export const COMMENT_COLOR_PALETTE = [
  "#FF2A33",
  "#F98C1D",
  "#DAB84D",
  "#459E6F",
  "#3088C1",
  "purple",
] as const;

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
 * Transforms a flat array of comments into a nested tree.
 *
 * @param options.threadRootId - When set, the returned tree is rooted at this
 *   comment rather than the post root. Only comments in that subtree are
 *   included.
 * @param options.selectedCommentId - When set, this comment is assigned
 *   sort=-1 so it floats to the top of its siblings.
 * @param options.getCommentPageCursor - Maps a comment to the page cursor it
 *   was fetched on. Prevents layout shift when additional pages load: new
 *   children are hydrated into branches already visible, but entirely new
 *   branches (whose cursor differs from the root's) are pruned and replaced
 *   with a `pruned=true` marker. The UI renders a "load more" affordance there
 *   rather than inserting new content above what the user has already scrolled.
 *
 * @example
 *   // pathToCursor records which page each comment path arrived on.
 *   // We record the first occurrence so that re-fetches don't change the cursor.
 *   const pathToCursor = new Map<string, string | number>();
 *   pages.forEach((page, i) => {
 *     page.comments.forEach((path) => {
 *       if (!pathToCursor.has(path)) pathToCursor.set(path, pageParams[i]);
 *     });
 *   });
 *
 *   const tree = buildCommentTree(comments, {
 *     getCommentPageCursor: (comment) => pathToCursor.get(comment.path),
 *   });
 *   // Render tree recursively
 */
export function buildCommentTree(
  commentViews: {
    id: number;
    postApId: string;
    childCount: number;
    path: string;
  }[],
  options: {
    threadRootId?: number;
    selectedCommentId?: number;
    maxDepth?: number;
    colorIndexOffset?: number;
    getCommentPageCursor?: (
      comment: CommentTreeComment,
    ) => number | string | undefined;
  },
): CommentTree | CommentTreeTopLevel {
  const { maxDepth = 6, getCommentPageCursor } = options;

  const map: CommentTreeTopLevel = getEmptyCommentTree();

  const threadRootId = options.threadRootId;
  const threadRootIdString = String(threadRootId);

  let i = 0;

  for (const view of _.uniqBy(commentViews, (c) => c.id)) {
    let loc: CommentTreeTopLevel | CommentTree = map;

    let viewPath = view.path;

    // Re-root the path at the thread root so ancestors above it are stripped.
    // e.g. with threadRootId="100", "0.50.100.200" becomes "0.100.200".
    // Without this, placeholder nodes would be created for every ancestor of
    // the thread root, and depth calculations would be wrong.
    if (threadRootId && viewPath.indexOf(threadRootIdString) > -1) {
      viewPath =
        "0." + viewPath.substring(viewPath.indexOf(threadRootIdString));
    }

    // Skip comments that cannot be descendants of the thread root.
    // A path shorter than threadRootId can't contain it as a suffix,
    // so we only check when the path is long enough to potentially match.
    if (threadRootId && viewPath.length > threadRootIdString.length) {
      if (viewPath.indexOf(threadRootIdString) === -1) {
        continue;
      }
    }

    const [_, ...path] = viewPath.split(".");
    const relativePathLength = threadRootId ? path.length - 1 : path.length;
    if (relativePathLength > maxDepth) {
      continue;
    }

    const viewCursor = getCommentPageCursor?.(view);
    const originalSegments = view.path.split(".");

    while (path.length > 1) {
      const front: CommentKey = +path.shift()!;
      loc.children[front] = loc.children[front] ?? {
        meta: {
          sort: i,
          immediateChildren: 0,
          pruned: false,
          colorIndex: 0,
          pageCursor: viewCursor,
          path: pathUpTo(originalSegments, front),
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
        sort: view.id === Number(options.selectedCommentId) ? -1 : i,
        immediateChildren: 0,
        pruned: false,
        colorIndex: 0,
        // Use the placeholder's cursor if it was created by an earlier fetch —
        // cursor tracks when the branch first became visible, not when this
        // specific comment arrived.
        pageCursor: loc.children[front]?.meta?.pageCursor ?? viewCursor,
        path: view.path,
      },
    };
    i++;
  }

  updateMeta(map, -1, options.colorIndexOffset ?? 0);

  const out = pruneCommentTree(map);
  if (options.threadRootId) {
    return getNodeAtPath(map, threadRootIdString) ?? getEmptyCommentTree();
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
  function pruneNode(
    node: CommentTree,
    rootCursor: string | number,
  ): undefined | "pruning" | "done" {
    const pageCursor = node.meta.pageCursor;
    if (node.comment && _.isNil(pageCursor)) {
      return "done";
    }

    // Depth-first scan of children
    const childComments = getCommentChildren(node);
    const results = childComments.map(([_, child]) =>
      pruneNode(child, rootCursor),
    );

    // Remove children whose cursor belongs to a different page
    for (const key of getCommentChildrenKeys(node)) {
      const childCursor = node.children[key]?.meta.pageCursor;
      if (isNotNil(childCursor) && childCursor !== rootCursor) {
        node.meta.pruned = true;
        delete node.children[key];
      }
    }

    // If any child reached a complete comment, stop pruning up the tree
    if (results.includes("done")) {
      return "done";
    }

    // If children are pruning and this node matches the root cursor,
    // anchor here so the node isn't clipped further up
    if (results.includes("pruning")) {
      return pageCursor === rootCursor ? "done" : "pruning";
    }

    return node.meta.pruned ? "pruning" : undefined;
  }

  for (const key of getCommentChildrenKeys(tree)) {
    const node = tree.children[key];
    if (node && isNotNil(node.meta.pageCursor)) {
      pruneNode(node, node.meta.pageCursor);
    }
  }

  return tree;
}

function updateMeta(
  node: CommentTree | CommentTreeTopLevel,
  recursionDepth: number,
  colorIndexOffset: number,
) {
  for (const child of _.values(node.children)) {
    const depth = recursionDepth + 1;
    child.meta.colorIndex = depth + colorIndexOffset;
    if (child.comment) {
      // This will sum over null\undefined, but
      // lodash seems to handle that gracefully
      const grandchildCount = _.sum(
        getCommentChildren(child).map(
          ([_key, node]) => node.comment?.childCount,
        ),
      );
      child.meta.immediateChildren = child.comment.childCount - grandchildCount;
    }
    updateMeta(child, depth, colorIndexOffset);
  }
}

function getCommentChildrenKeys(
  node: CommentTree | CommentTreeTopLevel,
): CommentKey[] {
  return _.keys(node.children).map(Number);
}

interface DebugTree {
  [key: string]: DebugTree;
}

export function debugCommentTree(
  tree: CommentTree | CommentTreeTopLevel,
  pathPrefix = "0",
): DebugTree {
  const result: DebugTree = {};
  for (const key of Object.keys(tree.children)) {
    const child = tree.children[Number(key)]!;
    const path = `${pathPrefix}.${key}`;
    const cursor = child.meta?.pageCursor;
    const sort = child.meta?.sort;
    const cursorPart = isNotNil(cursor) ? `c${cursor}` : "c?";
    const sortPart = isNotNil(sort) ? `s${sort}` : "s?";
    const label = `${cursorPart}_${sortPart}_${path}`;
    result[label] = debugCommentTree(child, path);
  }
  return result;
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
