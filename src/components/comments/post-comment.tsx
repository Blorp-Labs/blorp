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
import { useCommentsStore } from "@/src/stores/comments";
import { RelativeTime } from "../relative-time";
import {
  useAddCommentReactionEmoji,
  useBlockPerson,
  useDeleteComment,
  useLockComment,
  useMarkCommentAsAnswer,
  useSaveComment,
  useSoftware,
} from "@/src/lib/api/index";
import { CommentTree } from "@/src/lib/comment-tree";
import { useShowCommentReportModal } from "../posts/post-report";
import { useRequireAuth } from "../auth-context";
import { useLinkContext } from "../../routing/link-context";
import { encodeApId } from "@/src/lib/api/utils";
import { Link, resolveRoute } from "../../routing/index";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { ActionMenu } from "../adaptable/action-menu";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { Deferred } from "@/src/lib/deferred";
import { PersonHoverCard } from "../person/person-hover-card";
import {
  getAccountSite,
  useAuth,
  useIsAdmin,
  useIsPersonBlocked,
} from "@/src/stores/auth";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "../ui/button";
import { useMemo, useRef } from "react";
import { ContentGutters } from "../gutters";
import { useShareActions } from "@/src/lib/share";
import { useProfilesStore } from "@/src/stores/profiles";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible";
import { create } from "zustand";
import { COMMENT_COLLAPSE_EVENT } from "../posts/config";
import { useMedia } from "@/src/lib/hooks/index";
import { CakeDay } from "../cake-day";
import { useTagUser, useTagUserStore } from "@/src/stores/user-tags";
import { useSettingsStore } from "@/src/stores/settings";
import { FaBookmark } from "react-icons/fa6";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { useShowCommentRemoveModal } from "../posts/post-remove";
import { CommentCreatorBadge } from "./comment-creator-badge";
import { Check, Lock } from "../icons";
import { getCommentBgClass } from "./utils";
import {
  commentIsAnswer,
  getCommentEmojiReactions,
  getCommentMyVote,
} from "@/src/lib/api/adapters/utils";
import { useInputAlert } from "@/src/lib/hooks/index";

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
}) {
  const myUserId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.id,
  );

  const actorSlug = commentView?.creatorApId;
  const tag = useTagUserStore((s) =>
    actorSlug ? s.userTags[actorSlug] : null,
  );

  const saveComment = useSaveComment(commentView?.path);
  const markCommentAsAnswer = useMarkCommentAsAnswer();
  const addReactionEmoji = useAddCommentReactionEmoji();
  const inputAlert = useInputAlert();
  const answer = commentIsAnswer(commentView);
  const isPostAuthor = myUserId !== undefined && myUserId === postCreatorId;

  const isMyComment = commentView?.creatorId === myUserId;

  const [alrt] = useIonAlert();

  const showReportModal = useShowCommentReportModal();
  const requireAuth = useRequireAuth();

  const blockPerson = useBlockPerson();

  const deleteComment = useDeleteComment();
  const lockComment = useLockComment();

  const tagUser = useTagUser();
  const isCreatorBlocked = useIsPersonBlocked(commentView?.creatorApId);

  const router = useIonRouter();

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

  const saved = commentView?.optimisticSaved ?? commentView?.saved;
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
    ...(!isMyComment
      ? [
          {
            text: "Commenter",
            actions: [
              {
                text: "Tag commenter",
                onClick: async () => {
                  tagUser(commentView.creatorSlug, tag ?? undefined);
                },
              },
              {
                text: "Message commenter",
                onClick: () =>
                  requireAuth().then(() =>
                    router.push(
                      resolveRoute("/messages/chat/:userId", {
                        userId: encodeApId(commentView.creatorApId),
                      }),
                    ),
                  ),
              },
              {
                text: isCreatorBlocked
                  ? "Unblock commenter"
                  : "Block commenter",
                onClick: async () => {
                  try {
                    await requireAuth();
                    const deferred = new Deferred();
                    alrt({
                      message: `${isCreatorBlocked ? "Unblock" : "Block"} ${commentView.creatorSlug}`,
                      buttons: [
                        {
                          text: "Cancel",
                          role: "cancel",
                          handler: () => deferred.reject(),
                        },
                        {
                          text: "OK",
                          role: "confirm",
                          handler: () => deferred.resolve(),
                        },
                      ],
                    });
                    await deferred.promise;
                    blockPerson.mutate({
                      personId: commentView.creatorId,
                      block: !isCreatorBlocked,
                    });
                  } catch {}
                },
                danger: true,
              },
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
    ...(route ? shareActions : []),
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
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const profileView = useProfilesStore(
    (s) => s.profiles[getCachePrefixer()(actorId)]?.data,
  );

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
          className="text-base overflow-ellipsis flex flex-row overflow-x-hidden items-center"
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
          <CommentCreatorBadge
            postCreatorId={postCreatorId}
            comment={comment}
            isMod={isMod}
            className="ml-2"
          />
          {profileView && (
            <CakeDay
              className="text-brand ml-2"
              date={profileView.createdAt}
              isNewAccount={isAdmin ? false : undefined}
            />
          )}
        </Link>
      </PersonHoverCard>
      <span className="text-muted-foreground text-xs">•</span>
      <RelativeTime
        time={publishedDate}
        className="text-xs text-muted-foreground"
      />
      {locked && <Lock className="ml-1 text-yellow-500 text-sm -mt-0.5" />}
    </CollapsibleTrigger>
  );
}

export function PostComment({
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

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const commentView = useCommentsStore((s) =>
    comment ? s.comments[getCachePrefixer()(comment.path)]?.data : undefined,
  );
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
    ) ?? true;
  const setOpen = useDetailsStore((s) => s.setExpandedDetails);

  const ref = useRef<HTMLDivElement>(null);

  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);

  const requireAuth = useRequireAuth();
  const addReactionEmoji = useAddCommentReactionEmoji();

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

  const saved = commentView?.optimisticSaved ?? commentView?.saved;

  const actions = useCommentActions({
    commentView,
    queryKeyParentId,
    canMod,
    postCreatorId,
  });

  const bgOnParent = sorted.length === 0 && !replyState;

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
        level === 0 && "max-md:px-3.5 pb-2 bg-background",
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
              level === 0 && "pt-3",
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
                <FaBookmark
                  className={cn(
                    "text-lg text-brand",
                    leftHandedMode ? "ml-2" : "mr-2",
                  )}
                />
              )}
              <ActionMenu
                actions={actions}
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="z-10"
                    aria-label="Comment actions"
                  >
                    <IoEllipsisHorizontal size={16} />
                  </Button>
                }
                triggerAsChild
              />
              {!commentView.locked && !postLocked && !standalone && (
                <CommentReplyButton
                  onClick={() =>
                    loadCommentIntoEditor({
                      postApId: commentView.postApId,
                      queryKeyParentId: queryKeyParentId,
                      parent: commentView,
                    })
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
