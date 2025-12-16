import { MarkdownRenderer } from "../markdown/renderer";
import _ from "lodash";
import {
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
  useBlockPerson,
  useDeleteComment,
  useLockComment,
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
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
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
import { copyRouteToClipboard, shareRoute } from "@/src/lib/share";
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
import { Lock, personOutline } from "../icons";

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

export function useCommentActions({
  commentView,
  queryKeyParentId,
  canMod,
}: {
  commentView?: Schemas.Comment;
  queryKeyParentId?: number;
  canMod?: boolean;
}) {
  const myUserId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.id,
  );

  const actorSlug = commentView?.creatorApId;
  const tag = useTagUserStore((s) =>
    actorSlug ? s.userTags[actorSlug] : null,
  );

  const saveComment = useSaveComment(commentView?.path);

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

  const software = useSoftware();

  if (!commentView) {
    return [];
  }

  return [
    {
      hide: !canMod,
      text: "Moderation",
      actions: [
        {
          text: commentView.removed ? "Restore comment" : "Remove comment",
          onClick: () => showCommentRemoveModal(commentView.path),
        },
        {
          hide: software !== "piefed",
          text: locked ? "Unlock comment" : "Lock comment",
          onClick: () =>
            lockComment.mutate({
              path: commentView.path,
              commentId: commentView.id,
              locked: !locked,
            }),
        },
      ],
    },
    {
      icon: personOutline,
      text: "Commenter",
      hide: isMyComment,
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
          text: isCreatorBlocked ? "Unblock commenter" : "Block commenter",
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
    {
      hide: !isMyComment || commentView.deleted,
      text: "Edit",
      onClick: () => {
        loadCommentIntoEditor({
          postApId: commentView.postApId,
          queryKeyParentId: queryKeyParentId,
          comment: commentView,
        });
      },
    },
    {
      hide: !route,
      text: "Share",
      actions: [
        {
          text: "Share link to comment",
          onClick: () => {
            if (route) shareRoute(route);
          },
        },
        {
          text: "Copy link to comment",
          onClick: () => {
            if (route) copyRouteToClipboard(route);
          },
        },
      ],
    },
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
    {
      hide: !isMyComment,
      text: commentView.deleted ? "Restore" : "Delete",
      onClick: () => {
        deleteComment.mutate({
          id: commentView.id,
          path: commentView.path,
          deleted: !commentView.deleted,
        });
      },
      danger: true,
    },
    {
      hide: !canMod,
      text: "Report comment",
      onClick: () =>
        requireAuth().then(() => showReportModal(commentView.path)),
      danger: true,
    },
  ] satisfies ActionMenuProps["actions"];
}

function Byline({
  comment,
  actorId,
  actorSlug,
  publishedDate,
  isMod,
  className,
  opId,
}: {
  comment: Schemas.Comment;
  actorId: string;
  actorSlug: string;
  publishedDate: string;
  isMod?: boolean;
  className?: string;
  opId?: number;
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
      <Avatar className="w-6 h-6">
        <AvatarImage src={profileView?.avatar ?? undefined} />
        <AvatarFallback className="text-xs">
          {profileView?.slug?.substring(0, 1).toUpperCase()}{" "}
        </AvatarFallback>
      </Avatar>
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
            opId={opId}
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
  opId,
  communityName,
  modApIds,
  singleCommentThread,
  highlightCommentId,
  canMod,
}: {
  postApId: string;
  postLocked: boolean;
  queryKeyParentId?: number;
  commentTree: CommentTree;
  level: number;
  opId: number | undefined;
  communityName: string;
  modApIds?: string[];
  singleCommentThread?: boolean;
  highlightCommentId?: string;
  canMod?: boolean;
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

  const hasParent = useMemo(() => {
    if (level > 0 || !comment || !singleCommentThread) {
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

  const editingState = useCommentEditingState({
    comment: commentView,
  });
  const replyState = useCommentEditingState({
    parent: commentView,
  });

  const hideContent = commentView?.removed || commentView?.deleted || false;

  const highlightComment =
    highlightCommentId &&
    commentView &&
    highlightCommentId === String(commentView.id);

  const saved = commentView?.optimisticSaved ?? commentView?.saved;

  const actions = useCommentActions({
    commentView,
    queryKeyParentId,
    canMod,
  });

  const content = (
    <div
      ref={ref}
      className={cn(
        "flex-1 pt-2",
        level === 0 && "max-md:px-3.5 py-3 bg-background",
        level === 0 && !singleCommentThread && "border-t",
      )}
    >
      {singleCommentThread && level === 0 && (
        <div className="flex flex-row gap-2 items-center mb-6">
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
              open && "pb-1.5",
              level > 0 && !open && "pb-3",
              highlightComment && "bg-brand/10 dark:bg-brand/20",
            )}
            actorId={commentView.creatorApId}
            actorSlug={commentView.creatorSlug}
            publishedDate={commentView.createdAt}
            isMod={isMod}
            comment={commentView}
            opId={opId}
          />
        )}

        <CollapsibleContent>
          {commentView?.deleted && (
            <span className="italic text-sm">deleted</span>
          )}
          {commentView?.removed && (
            <span className="italic text-sm">removed</span>
          )}
          {!commentView && (
            <span className="italic text-sm">missing comment</span>
          )}

          {!hideContent && !editingState && commentView && (
            <div {...doubleTapLike}>
              <MarkdownRenderer
                markdown={commentView.body}
                className={cn(
                  highlightComment && "bg-brand/10 dark:bg-brand/20",
                )}
              />
            </div>
          )}

          {/* Editing */}
          {editingState && (
            <InlineCommentReply state={editingState} autoFocus />
          )}

          {commentView && (
            <div
              className={cn(
                "flex flex-row items-center text-sm text-muted-foreground justify-end gap-1",
                leftHandedMode && "flex-row-reverse",
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

              {!commentView.locked && !postLocked && (
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
                  level={level + 1}
                  opId={opId}
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
