import { MarkdownRenderer } from "../markdown/renderer";
import _ from "lodash";
import {
  CommentEmojiReactions,
  CommentReplyButton,
  CommentVoting,
  useDoubleTapLike,
} from "./comment-buttons";
import {
  InlineCommentReply,
  useCommentEditingState,
  useLoadCommentIntoEditor,
} from "./comment-reply-modal";
import { useCommentsByPaths } from "@/src/stores/comments";
import { RelativeTime } from "../relative-time";
import {
  useAddCommentReactionEmojiMutation,
  useDeleteCommentMutation,
  useLockCommentMutation,
  useMarkCommentAsAnswerMutation,
  useSaveCommentMutation,
  useSoftware,
} from "@/src/queries/index";
import { CommentTree } from "@/src/lib/comment-tree";
import { useShowCommentReportModal } from "../posts/post-report";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { encodeApId } from "@/src/apis/utils";
import { Link, resolveRoute } from "../../routing/index";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { ActionMenuProps, EllipsisActionMenu } from "../adaptable/action-menu";
import { PersonHoverCard } from "../person/person-hover-card";
import { getAccountSite, useAuth, useIsAdmin } from "@/src/stores/auth";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "../ui/button";
import { useMemo, useRef } from "react";
import { ContentGutters } from "../gutters";
import { useShareActions } from "@/src/components/adaptable/action-menu/hooks";
import { useProfileFromStore } from "@/src/stores/profiles";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible";
import { create } from "zustand";
import { COMMENT_COLLAPSE_EVENT } from "../posts/config";
import { useMedia, useInputAlert, useRequireAuth } from "@/src/hooks";
import { CakeDay } from "../cake-day";
import { useTagUserStore } from "@/src/stores/user-tags";
import { useSettingsStore } from "@/src/stores/settings";
import {
  useCommentCollapseThreshold,
  useCommentHideThreshold,
} from "@/src/stores/utils";
import { Schemas } from "@/src/apis/api-blueprint";
import { useShowCommentRemoveModal } from "../posts/post-remove";
import { CommentCreatorBadge } from "./comment-creator-badge";
import { Bookmark, Check, Lock } from "../icons";
import { getCommentBgClass } from "./utils";
import {
  commentIsAnswer,
  getCommentEmojiReactions,
  getCommentMyVote,
  getCommentSaved,
} from "@/src/apis/utils";
import { usePersonActions } from "../person/person-action-menu";
import { ErrorBoundary } from "react-error-boundary";
import { useIonRouter } from "@ionic/react";
import { useCreatePostStore } from "@/src/stores/create-post";
import { v4 as uuid } from "uuid";
import { parseAccountInfo } from "@/src/stores/auth";
import {
  BLORP_COMMUNITY,
  buildErrorReport,
  buildIssueUrl,
} from "@/src/lib/error-reporting";

type StoreState = {
  expandedDetails: Record<string, boolean>;
  setExpandedDetails: (id: string, expanded: boolean) => void;
};

const useDetailsStore = create<StoreState>((set) => ({
  expandedDetails: {},
  setExpandedDetails: (id, expanded) => {
    set((prev) => ({
      expandedDetails: {
        ...prev.expandedDetails,
        [id]: expanded,
      },
    }));
  },
}));

export const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

export function useCommentActions({
  commentView,
  queryKeyParentId,
  canMod,
  postCreatorId,
}: {
  commentView?: Schemas.Comment;
  queryKeyParentId?: number;
  canMod?: boolean;
  postCreatorId?: number;
}): ActionMenuProps["actions"] {
  const myUserId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.id,
  );

  const saveComment = useSaveCommentMutation(commentView?.path);
  const markCommentAsAnswer = useMarkCommentAsAnswerMutation();
  const addReactionEmoji = useAddCommentReactionEmojiMutation();
  const inputAlert = useInputAlert();
  const answer = commentIsAnswer(commentView);
  const isPostAuthor = myUserId !== undefined && myUserId === postCreatorId;

  const isMyComment = commentView?.creatorId === myUserId;

  const showReportModal = useShowCommentReportModal();
  const requireAuth = useRequireAuth();

  const deleteComment = useDeleteCommentMutation();
  const lockComment = useLockCommentMutation();

  const loadCommentIntoEditor = useLoadCommentIntoEditor();

  const linkCtx = useLinkContext();

  const route = commentView
    ? resolveRoute(
        `${linkCtx.root}c/:communityName/posts/:post/comments/:comment`,
        {
          communityName: commentView.communitySlug,
          post: encodeApId(commentView.postApId),
          comment: encodeApId(commentView.apId),
        },
      )
    : null;

  const saved = commentView ? getCommentSaved(commentView) : undefined;
  const locked = commentView?.optimisticLocked ?? commentView?.locked;

  const showCommentRemoveModal = useShowCommentRemoveModal();

  const shareActions = useShareActions(
    "comment",
    commentView
      ? {
          type: "comment",
          apId: commentView.apId,
          postId: commentView.postId,
          commentId: commentView.id,
          communitySlug: commentView.communitySlug,
          route: route!,
        }
      : null,
  );

  const commenter = useProfileFromStore(commentView?.creatorApId);
  const commenterActions = usePersonActions({
    person: commenter,
    personLabel: "commenter",
  });

  const { software } = useSoftware();

  if (!commentView) {
    return [];
  }

  return [
    ...(canMod
      ? [
          {
            text: "Moderation",
            actions: [
              {
                text: commentView.removed
                  ? "Restore comment"
                  : "Remove comment",
                onClick: () => showCommentRemoveModal(commentView.path),
              },
              ...(software === "piefed"
                ? [
                    {
                      text: locked ? "Unlock comment" : "Lock comment",
                      onClick: () =>
                        lockComment.mutate({
                          path: commentView.path,
                          commentId: commentView.id,
                          locked: !locked,
                        }),
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    ...(isMyComment && !commentView.deleted
      ? [
          {
            text: "Edit",
            onClick: () => {
              loadCommentIntoEditor({
                postApId: commentView.postApId,
                queryKeyParentId: queryKeyParentId,
                comment: commentView,
              });
            },
          } as const,
        ]
      : []),
    ...(software === "piefed" && commentView
      ? [
          {
            text: "React",
            actions: [
              ...QUICK_REACTION_EMOJIS.map((emoji) => ({
                text: emoji,
                onClick: () =>
                  requireAuth().then(() =>
                    addReactionEmoji.mutate({
                      path: commentView.path,
                      commentId: commentView.id,
                      emoji,
                      score: getCommentMyVote(commentView) ?? undefined,
                    }),
                  ),
              })),
              {
                text: "Other...",
                onClick: async () => {
                  try {
                    await requireAuth();
                    const emoji = await inputAlert({
                      header: "React with emoji",
                      placeholder: "Enter an emoji",
                    });
                    addReactionEmoji.mutate({
                      path: commentView.path,
                      commentId: commentView.id,
                      emoji,
                    });
                  } catch {}
                },
              },
            ],
          },
        ]
      : []),
    {
      text: saved ? "Unsave comment" : "Save comment",
      onClick: () =>
        requireAuth().then(() => {
          saveComment.mutateAsync({
            commentId: commentView.id,
            save: !saved,
          });
        }),
    },
    ...(route ? shareActions : []),
    ...((isPostAuthor || canMod) && commentView && software === "piefed"
      ? [
          {
            text: answer ? "Unmark as answer" : "Mark as answer",
            onClick: () =>
              markCommentAsAnswer.mutate({
                path: commentView.path,
                commentId: commentView.id,
                answer: !answer,
              }),
          },
        ]
      : []),
    ...(isMyComment
      ? [
          {
            text: commentView.deleted ? "Restore" : "Delete",
            onClick: () => {
              deleteComment.mutate({
                id: commentView.id,
                path: commentView.path,
                deleted: !commentView.deleted,
              });
            },
            danger: true,
          } as const,
        ]
      : []),
    ...(!isMyComment && !canMod
      ? [
          {
            text: "Report comment",
            onClick: () =>
              requireAuth().then(() => showReportModal(commentView.path)),
            danger: true,
          } as const,
        ]
      : []),
    "DIVIDER",
    ...(!isMyComment
      ? [
          {
            text: "Commenter",
            actions: commenterActions,
          },
        ]
      : []),
  ];
}

function Byline({
  comment,
  actorId,
  actorSlug,
  publishedDate,
  isMod,
  className,
  postCreatorId,
}: {
  comment: Schemas.Comment;
  actorId: string;
  actorSlug: string;
  publishedDate: string;
  isMod?: boolean;
  className?: string;
  postCreatorId?: number;
}) {
  const linkCtx = useLinkContext();
  const profileView = useProfileFromStore(actorId);

  const locked = comment.optimisticLocked ?? comment.locked;

  const tag = useTagUserStore((s) => s.userTags[actorSlug]);

  const isAdmin = useIsAdmin(comment.creatorApId);

  const [name, host] = profileView?.slug.split("@") ?? [];

  return (
    <CollapsibleTrigger
      className={cn(
        "flex flex-row gap-1.5 items-center py-px w-full",
        className,
      )}
    >
      {commentIsAnswer(comment) ? (
        <div className="w-6 h-6 bg-green-600 flex items-center justify-center">
          <Check className="text-green-100" />
        </div>
      ) : (
        <Avatar className="w-6 h-6">
          <AvatarImage src={profileView?.avatar ?? undefined} />
          <AvatarFallback className="text-xs">
            {profileView?.slug?.substring(0, 1).toUpperCase()}{" "}
          </AvatarFallback>
        </Avatar>
      )}
      <PersonHoverCard actorId={actorId} asChild>
        <Link
          to={`${linkCtx.root}u/:userId`}
          params={{
            userId: encodeApId(actorId),
          }}
          className="text-base overflow-ellipsis flex flex-row overflow-x-hidden items-center hover:underline"
        >
          <span className="font-medium text-xs">{name}</span>
          {tag ? (
            <Badge size="sm" variant="brand-secondary" className="ml-2">
              {tag}
            </Badge>
          ) : (
            <span className="italic text-xs text-muted-foreground">
              @{host}
            </span>
          )}
        </Link>
      </PersonHoverCard>
      <CommentCreatorBadge
        postCreatorId={postCreatorId}
        comment={comment}
        isMod={isMod}
      />
      {profileView && (
        <CakeDay
          className="text-brand"
          date={profileView.createdAt}
          isNewAccount={isAdmin ? false : undefined}
        />
      )}
      <span className="text-muted-foreground text-xs">•</span>
      <RelativeTime
        time={publishedDate}
        className="text-xs text-muted-foreground"
      />
      {locked && <Lock className="ml-1 text-yellow-500 text-sm -mt-0.5" />}
    </CollapsibleTrigger>
  );
}

function PostCommentErrorFallback({
  commentTree,
  error,
}: {
  commentTree: CommentTree;
  error: unknown;
}) {
  const router = useIonRouter();
  const updateDraft = useCreatePostStore((s) => s.updateDraft);
  const requireAuth = useRequireAuth();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const instance = useAuth(
    (s) => parseAccountInfo(s.getSelectedAccount()).instance,
  );
  const [commentView] = useCommentsByPaths(
    commentTree.comment ? [commentTree.comment.path] : [],
  );
  const apId = commentView?.apId;

  const body = buildErrorReport(
    { ...(apId ? { "Comment apId": apId } : {}), "User Instance": instance },
    error,
  );
  const issueUrl = buildIssueUrl("[Crash] Comment rendering error", body);

  const reportViaCommunity = async () => {
    try {
      await requireAuth();
    } catch {
      return;
    }
    const draftId = uuid();
    updateDraft(draftId, {
      type: "text",
      communitySlug: BLORP_COMMUNITY,
      title: "[Crash] Comment rendering error",
      body,
    });
    router.push(resolveRoute("/create_post", `?id=${draftId}`));
  };

  return (
    <div className="border-b p-4 text-sm flex flex-col gap-5 bg-destructive/20">
      <p className="font-medium text-destructive text-lg">
        Failed to render comment
      </p>
      {apId && (
        <a
          href={apId}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-muted-foreground underline"
        >
          {apId}
        </a>
      )}
      <div className={cn("flex flex-wrap justify-end gap-2")}>
        <Button
          size="sm"
          variant={isLoggedIn ? "destructive" : "link"}
          onClick={reportViaCommunity}
        >
          Report in App
        </Button>
        <Button size="sm" variant={isLoggedIn ? "link" : "destructive"} asChild>
          <a href={issueUrl} target="_blank" rel="noopener noreferrer">
            Report on GitHub
          </a>
        </Button>
      </div>
    </div>
  );
}

function PostCommentInner({
  postApId,
  postLocked,
  queryKeyParentId,
  commentTree,
  level,
  postCreatorId,
  communityName,
  modApIds,
  singleCommentThread,
  highlightCommentId,
  canMod,
  standalone,
}: {
  postApId: string;
  postLocked: boolean;
  queryKeyParentId?: number;
  commentTree: CommentTree;
  level?: number;
  postCreatorId?: number;
  communityName: string;
  modApIds?: string[];
  singleCommentThread?: boolean;
  highlightCommentId?: string;
  canMod?: boolean;
  standalone?: boolean;
}) {
  const media = useMedia();
  const loadCommentIntoEditor = useLoadCommentIntoEditor();

  const linkCtx = useLinkContext();

  const { comment, ...rest } = commentTree;

  const [commentView] = useCommentsByPaths(comment ? [comment.path] : []);
  const isMod = commentView && modApIds?.includes(commentView?.creatorApId);

  const doubleTapLike = useDoubleTapLike(
    commentView
      ? {
          postId: commentView.postId,
          id: commentView.id,
          score: 1,
          path: commentView.path,
        }
      : undefined,
  );

  const sorted = _.entries(_.omit(rest, ["sort", "imediateChildren"])).sort(
    ([_id1, a], [_id2, b]) => a.sort - b.sort,
  );

  let color = "red";
  if (_.isNumber(level)) {
    switch (level % 6) {
      case 0:
        color = "#FF2A33";
        break;
      case 1:
        color = "#F98C1D";
        break;
      case 2:
        color = "#DAB84D";
        break;
      case 3:
        color = "#459E6F";
        break;
      case 4:
        color = "#3088C1";
        break;
      case 5:
        color = "purple";
        break;
    }
  }

  const collapseThreshold = useCommentCollapseThreshold();
  const hideThreshold = useCommentHideThreshold();
  const commentScore = commentView
    ? commentView.upvotes - commentView.downvotes
    : 0;
  const shouldHide =
    hideThreshold !== null && commentView && commentScore <= hideThreshold;
  const collapseRemovedComments = useSettingsStore(
    (s) => s.collapseRemovedComments,
  );
  const isRemovedOrDeleted = commentView?.removed || commentView?.deleted;
  const shouldAutoCollapse =
    (collapseThreshold !== null &&
      commentView &&
      commentScore <= collapseThreshold) ||
    (collapseRemovedComments && isRemovedOrDeleted);

  const hasParent = useMemo(() => {
    if (_.isNil(level) || level > 0 || !comment || !singleCommentThread) {
      return false;
    }
    const parent = comment.path.split(".").slice(-2);
    if (parent.length < 1 || parent?.includes("0")) {
      return false;
    }
    return true;
  }, [level, comment, singleCommentThread]);

  const open =
    useDetailsStore((s) =>
      commentView?.apId ? s.expandedDetails[commentView.apId] : null,
    ) ?? !shouldAutoCollapse;
  const setOpen = useDetailsStore((s) => s.setExpandedDetails);

  const ref = useRef<HTMLDivElement>(null);

  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);

  const requireAuth = useRequireAuth();
  const addReactionEmoji = useAddCommentReactionEmojiMutation();

  const editingState = useCommentEditingState({
    comment: commentView,
  });
  const replyState = useCommentEditingState({
    parent: commentView,
  });

  const hideContent = commentView?.removed || commentView?.deleted || false;

  const highlightComment =
    _.isString(highlightCommentId) &&
    commentView &&
    highlightCommentId === String(commentView.id);

  const saved = commentView ? getCommentSaved(commentView) : undefined;

  const actions = useCommentActions({
    commentView,
    queryKeyParentId,
    canMod,
    postCreatorId,
  });

  const bgOnParent = sorted.length === 0 && !replyState;

  if (shouldHide) {
    return null;
  }

  const bodyRenderer = commentView && (
    <>
      {commentView?.deleted && <span className="italic text-sm">deleted</span>}
      {commentView?.removed && <span className="italic text-sm">removed</span>}
      {!commentView && <span className="italic text-sm">missing comment</span>}
      {!hideContent && (
        <MarkdownRenderer
          markdown={commentView.body}
          className={cn(
            !bgOnParent && getCommentBgClass({ commentView, highlightComment }),
          )}
        />
      )}
    </>
  );

  const content = (
    <div
      ref={ref}
      className={cn(
        "flex-1",
        level === 0 && "max-md:px-3.5 pb-2.5 bg-background",
        level === 0 && !singleCommentThread && "border-t",
        bgOnParent && getCommentBgClass({ commentView, highlightComment }),
      )}
    >
      {singleCommentThread && level === 0 && (
        <div className={cn("flex flex-row gap-2 items-center mb-6")}>
          {hasParent && commentView && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground font-normal"
              asChild
            >
              <Link
                to={`${linkCtx.root}c/:communityName/posts/:post/comments/:comment`}
                params={{
                  communityName,
                  post: encodeApId(postApId),
                  comment: encodeApId(commentView.apId),
                }}
                replace
              >
                View parent comment
              </Link>
            </Button>
          )}
          <div className="h-px flex-1 bg-border" />
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground font-normal"
            asChild
          >
            <Link
              to={`${linkCtx.root}c/:communityName/posts/:post`}
              params={{
                communityName,
                post: encodeApId(postApId),
              }}
              replace
            >
              View all comments
            </Link>
          </Button>
          {!hasParent && <div className="h-px flex-1 bg-border" />}
        </div>
      )}
      <Collapsible
        className={cn(commentView && commentView.id < 0 && "opacity-50")}
        defaultOpen={open}
        onOpenChange={() => {
          if (commentView) {
            setOpen(commentView.apId, !open);
            ref.current?.dispatchEvent(
              new CustomEvent<boolean>(COMMENT_COLLAPSE_EVENT, {
                bubbles: true,
              }),
            );
          }
        }}
      >
        {commentView && (
          <Byline
            className={cn(
              "pt-2",
              level === 0 && "pt-2.5",
              open && "pb-1.5",
              level && level > 0 && !open && "pb-3",
              !bgOnParent &&
                getCommentBgClass({ commentView, highlightComment }),
            )}
            actorId={commentView.creatorApId}
            actorSlug={commentView.creatorSlug}
            publishedDate={commentView.createdAt}
            isMod={isMod}
            comment={commentView}
            postCreatorId={postCreatorId}
          />
        )}

        <CollapsibleContent>
          {!editingState &&
            commentView &&
            (standalone ? (
              <Link
                to="/inbox/c/:communityName/posts/:post/comments/:comment"
                params={{
                  post: encodeApId(commentView.postApId),
                  comment: encodeApId(commentView.apId),
                  communityName: commentView.communitySlug,
                }}
              >
                {bodyRenderer}
              </Link>
            ) : (
              <div {...doubleTapLike}>{bodyRenderer}</div>
            ))}

          {/* Editing */}
          {editingState && (
            <InlineCommentReply state={editingState} autoFocus />
          )}

          {commentView && (
            <div
              className={cn(
                "flex flex-row items-center text-sm text-muted-foreground justify-end gap-1 pt-1",
                leftHandedMode && "flex-row-reverse",
                !bgOnParent &&
                  getCommentBgClass({ commentView, highlightComment }),
              )}
            >
              {saved && (
                <Bookmark
                  className={cn(
                    "text-lg text-brand",
                    leftHandedMode ? "ml-2" : "mr-2",
                  )}
                />
              )}
              <EllipsisActionMenu
                actions={actions}
                aria-label="Comment actions"
              />
              {!commentView.locked && !postLocked && !standalone && (
                <CommentReplyButton
                  onClick={() =>
                    requireAuth().then(() =>
                      loadCommentIntoEditor({
                        postApId: commentView.postApId,
                        queryKeyParentId: queryKeyParentId,
                        parent: commentView,
                      }),
                    )
                  }
                  className="z-10"
                />
              )}

              <CommentEmojiReactions
                reactions={
                  commentView
                    ? getCommentEmojiReactions(commentView)
                    : undefined
                }
                onReact={(emoji) =>
                  requireAuth().then(() =>
                    addReactionEmoji.mutate({
                      commentId: commentView!.id,
                      path: commentView!.path,
                      emoji,
                      score: getCommentMyVote(commentView!) || undefined,
                    }),
                  )
                }
              />

              <CommentVoting
                commentView={commentView}
                className={cn("z-10", leftHandedMode ? "-ml-2.5" : "-mr-2.5")}
              />
            </div>
          )}

          {(sorted.length > 0 ||
            rest.imediateChildren > 0 ||
            (replyState && media.md)) && (
            <div
              className="border-l-[2px] border-b-[2px] pl-3 md:pl-3.5 rounded-bl-xl mb-2"
              style={{ borderColor: color }}
            >
              {replyState && (
                <InlineCommentReply state={replyState} autoFocus />
              )}

              {sorted.map(([id, map]) => (
                <PostComment
                  postApId={postApId}
                  postLocked={postLocked}
                  queryKeyParentId={queryKeyParentId}
                  key={id}
                  commentTree={map}
                  level={_.isNumber(level) ? level + 1 : level}
                  postCreatorId={postCreatorId}
                  communityName={communityName}
                  highlightCommentId={highlightCommentId}
                  modApIds={modApIds}
                  canMod={canMod}
                />
              ))}

              {commentView && sorted.length < rest.imediateChildren ? (
                <Link
                  to={`${linkCtx.root}c/:communityName/posts/:post/comments/:comment`}
                  params={{
                    communityName: commentView.communitySlug,
                    post: encodeApId(commentView.postApId),
                    comment: encodeApId(commentView?.apId),
                  }}
                  className="translate-y-1/2 pl-2 bg-background block text-muted-foreground"
                >
                  View more
                </Link>
              ) : (
                <div className="h-2 -mt-2 w-full bg-background translate-y-1" />
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  if (level === 0) {
    return (
      <ContentGutters className="px-0">
        {content}
        <></>
      </ContentGutters>
    );
  }

  return content;
}

export function PostComment(props: Parameters<typeof PostCommentInner>[0]) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <PostCommentErrorFallback
          commentTree={props.commentTree}
          error={error}
        />
      )}
      resetKeys={[props.commentTree.comment?.id]}
    >
      <PostCommentInner {...props} />
    </ErrorBoundary>
  );
}
