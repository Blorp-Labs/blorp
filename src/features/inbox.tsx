import { Link } from "@/src/routing/index";
import { VirtualList } from "@/src/components/virtual-list";
import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { RelativeTime } from "@/src/components/relative-time";
import {
  useCommentReportsQuery,
  useMarkAllRead,
  useMarkPersonMentionRead,
  useMarkReplyRead,
  useNotificationCount,
  usePersonMentions,
  usePostReportsQuery,
  useReplies,
  useResolvePostReportMutation,
  useResolveCommentReportMutation,
} from "@/src/lib/api/index";
import { IonButton, IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { MenuButton, UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { cn } from "../lib/utils";
import { useMemo } from "react";
import { usePagination } from "../lib/hooks/use-pagination";
import { useSettingsStore } from "../stores/settings";
import _ from "lodash";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { useConfirmationAlert, useMedia } from "../lib/hooks";
import { useInboxStore } from "../stores/inbox";
import { Skeleton } from "../components/ui/skeleton";
import { EllipsisActionMenu } from "../components/adaptable/action-menu";
import { PersonAvatar } from "../components/person/person-avatar";
import { BadgeCount, BadgeIcon } from "../components/badge-count";
import { DoubleCheck, Message, Person, Report } from "../components/icons";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { Button } from "../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { encodeApId } from "../lib/api/utils";
import {
  CommentButtonBar,
  CommentVoting,
} from "../components/comments/comment-buttons";
import { useCommentsByPaths } from "../stores/comments";
import {
  PostComment,
  useCommentActions,
} from "../components/comments/post-comment";
import { Page } from "../components/page";
import { usePostFromStore } from "../stores/posts";
import { SmallPostCard } from "../components/posts/post";
import { getAccountSite, useAuth } from "../stores/auth";
import { Checkbox } from "../components/ui/checkbox";
import { PersonHoverCard } from "../components/person/person-hover-card";

type Item =
  | { id: string; reply: Schemas.Reply }
  | { id: string; mention: Schemas.Mention }
  | { id: string; postReport: Schemas.PostReport }
  | { id: string; commentReport: Schemas.CommentReport };

function Placeholder() {
  return (
    <ContentGutters>
      <div className="flex-1 flex mt-2.5 gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-5.5" />
          <Skeleton className="h-6 w-12 self-end" />
          <Skeleton className="h-px mt-0.5" />
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

function PostReport({
  postReport,
  noBorder = false,
}: {
  postReport: Schemas.PostReport;
  noBorder?: boolean;
}) {
  const postView = usePostFromStore(postReport.postApId);
  const me = useAuth((s) => getAccountSite(s.getSelectedAccount())?.me);
  const resolvePostReport = useResolvePostReportMutation();
  return (
    <ContentGutters noMobilePadding>
      <div
        className={cn(
          "flex-1",
          !noBorder && "border-b",
          ContentGutters.mobilePadding,
        )}
      >
        <div className="flex mt-2.5 mb-1 gap-3 items-start">
          <Link
            to="/inbox/u/:userId"
            params={{ userId: encodeApId(postReport.creatorApId) }}
          >
            <BadgeIcon
              icon={<Report className="h-full w-full text-muted-foreground" />}
            >
              <PersonAvatar actorId={postReport.creatorApId} size="sm" />
            </BadgeIcon>
          </Link>
          <div
            className={cn(
              "flex-1 text-sm leading-6 min-w-0 gap-2 flex flex-col",
              !postReport.resolved && "border-l-3 border-l-brand pl-2",
            )}
          >
            {postView && (
              <div className="border md:px-2 rounded-lg">
                <SmallPostCard
                  post={{
                    ...postView,
                    title: postReport.originalPostName,
                    url: postReport.originalPostUrl,
                    body: postReport.originalPostBody,
                  }}
                  modApIds={me ? [me.apId] : undefined}
                  apId={postReport.postApId}
                  className="border-b-0"
                />
              </div>
            )}
            <p>{postReport.reason}</p>
            <div className="flex flex-row items-center gap-2">
              <RelativeTime time={postReport.createdAt} />
              <div className="flex-1" />
              {postReport.resolverApId && (
                <>
                  <i>{postReport.resolved ? "Resolved" : "Unresolved"} by</i>
                  <PersonHoverCard
                    actorId={postReport.resolverApId}
                    align="center"
                  >
                    <PersonAvatar actorId={postReport.resolverApId} size="xs" />
                  </PersonHoverCard>
                </>
              )}
              <Checkbox
                checked={postReport.resolved}
                onCheckedChange={(checked) =>
                  resolvePostReport.mutate({
                    reportId: postReport.id,
                    resolved: checked === true,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

function CommentReport({
  commentReport,
  noBorder = false,
}: {
  commentReport: Schemas.CommentReport;
  noBorder?: boolean;
}) {
  const [commentView] = useCommentsByPaths([commentReport.commentPath]);
  const resolveCommentReport = useResolveCommentReportMutation();
  return (
    <ContentGutters noMobilePadding>
      <div
        className={cn(
          "flex-1",
          !noBorder && "border-b",
          ContentGutters.mobilePadding,
        )}
      >
        <div className="flex mt-2.5 mb-1 gap-3 items-start">
          <Link
            to="/inbox/u/:userId"
            params={{ userId: encodeApId(commentReport.creatorApId) }}
          >
            <BadgeIcon
              icon={<Report className="h-full w-full text-muted-foreground" />}
            >
              <PersonAvatar actorId={commentReport.creatorApId} size="sm" />
            </BadgeIcon>
          </Link>
          <div
            className={cn(
              "flex-1 text-sm leading-6 min-w-0 gap-2 flex flex-col",
              !commentReport.resolved && "border-l-3 border-l-brand pl-2",
            )}
          >
            {commentView && (
              <div className="border px-2 rounded-lg">
                <PostComment
                  communityName={commentView.communitySlug}
                  postApId={commentView.postApId}
                  postLocked={false}
                  commentTree={{
                    comment: commentView,
                    imediateChildren: 0,
                    sort: 0,
                  }}
                  canMod
                  standalone
                />
              </div>
            )}
            <p>{commentReport.reason}</p>
            <div className="flex flex-row items-center gap-2">
              <RelativeTime time={commentReport.createdAt} />
              <div className="flex-1" />
              {commentReport.resolverApId && (
                <>
                  <i>{commentReport.resolved ? "Resolved" : "Unresolved"} by</i>
                  <PersonHoverCard
                    actorId={commentReport.resolverApId}
                    align="center"
                  >
                    <PersonAvatar
                      actorId={commentReport.resolverApId}
                      size="xs"
                    />
                  </PersonHoverCard>
                </>
              )}
              <Checkbox
                checked={commentReport.resolved}
                onCheckedChange={(checked) =>
                  resolveCommentReport.mutate({
                    reportId: commentReport.id,
                    resolved: checked === true,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

function Mention({
  mention,
  noBorder = false,
}: {
  mention: Schemas.Mention;
  noBorder?: boolean;
}) {
  const [commentView] = useCommentsByPaths([mention.path]);
  const actions = useCommentActions({
    commentView,
  });
  const markRead = useMarkPersonMentionRead();
  return (
    <ContentGutters noMobilePadding>
      <div
        className={cn(
          "flex-1",
          !noBorder && "border-b",
          ContentGutters.mobilePadding,
        )}
      >
        <div className="flex mt-2.5 mb-1 gap-3 items-start">
          <Link
            to="/inbox/u/:userId"
            params={{ userId: encodeApId(mention.creatorApId) }}
          >
            <BadgeIcon
              icon={<Person className="h-full w-full text-muted-foreground" />}
            >
              <PersonAvatar actorId={mention.creatorApId} size="sm" />
            </BadgeIcon>
          </Link>
          <div
            className={cn(
              "flex-1 text-sm leading-6 block min-w-0",
              !mention.read && "border-l-3 border-l-brand pl-2",
            )}
          >
            <Link
              to={`/inbox/c/:communityName/posts/:post/comments/:comment`}
              params={{
                communityName: mention.communitySlug,
                post: encodeApId(mention.postApId),
                comment: encodeApId(mention.commentApId),
              }}
              onClickCapture={() => {
                markRead.mutate({
                  id: mention.id,
                  read: true,
                });
              }}
            >
              <div className="flex flex-row flex-wrap">
                {mention.read ? null : <div />}
                <span>
                  <span className="font-bold">{mention.creatorSlug}</span>
                  <span> mentioned you in the post </span>
                  <span className="font-bold">{mention.postName}</span>
                </span>
              </div>
              <MarkdownRenderer
                markdown={mention.body}
                className="pb-1"
                disableLinks
              />
            </Link>
            <CommentButtonBar>
              <RelativeTime time={mention.createdAt} />
              <div className="flex-1" />
              <EllipsisActionMenu
                actions={[
                  {
                    text: mention.read ? "Mark unread" : "Mark read",
                    onClick: () =>
                      markRead.mutate({
                        id: mention.id,
                        read: !mention.read,
                      }),
                  },
                  ...actions,
                ]}
              />
              {commentView && (
                <CommentVoting commentView={commentView} fixRightAlignment />
              )}
            </CommentButtonBar>
          </div>
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

function Reply({
  replyView,
  noBorder = false,
}: {
  replyView: Schemas.Reply;
  noBorder?: boolean;
}) {
  const markRead = useMarkReplyRead();
  const path = replyView.path.split(".");
  const parent = path.at(-2);
  const hasParent = parent && parent !== "0";
  const [commentView] = useCommentsByPaths([replyView.path]);
  const actions = useCommentActions({
    commentView,
  });
  return (
    <ContentGutters noMobilePadding>
      <div
        className={cn(
          "flex-1",
          !noBorder && "border-b",
          ContentGutters.mobilePadding,
        )}
      >
        <div className="flex mt-2.5 mb-1 gap-3 items-start">
          <Link
            to="/inbox/u/:userId"
            params={{ userId: encodeApId(replyView.creatorApId) }}
          >
            <BadgeIcon
              icon={<Message className="h-full w-full text-muted-foreground" />}
            >
              <PersonAvatar actorId={replyView.creatorApId} size="sm" />
            </BadgeIcon>
          </Link>
          <div
            className={cn(
              "flex-1 text-sm leading-6 block min-w-0",
              !replyView.read && "border-l-3 border-l-brand pl-2",
            )}
          >
            <Link
              to={`/inbox/c/:communityName/posts/:post/comments/:comment`}
              params={{
                communityName: replyView.communitySlug,
                post: encodeApId(replyView.postApId),
                comment: encodeApId(replyView.commentApId),
              }}
              onClickCapture={() => {
                markRead.mutate({
                  id: replyView.id,
                  read: true,
                });
              }}
            >
              <div className="flex flex-row flex-wrap">
                {replyView.read ? null : <div />}
                <span>
                  <span className="font-bold">{replyView.creatorSlug}</span>
                  <span>
                    {" "}
                    replied to your {hasParent ? "comment" : "post"} in{" "}
                  </span>
                  <span className="font-bold">{replyView.postName}</span>
                </span>
              </div>
              {!replyView.deleted && !replyView.removed && (
                <MarkdownRenderer
                  markdown={replyView.body}
                  className="pb-1"
                  disableLinks
                />
              )}
              {replyView.deleted && <span className="italic">deleted</span>}
              {replyView.removed && <span className="italic">removed</span>}
            </Link>
            <CommentButtonBar>
              <RelativeTime time={replyView.createdAt} />
              <div className="flex-1" />
              <EllipsisActionMenu
                actions={[
                  {
                    text: replyView.read ? "Mark unread" : "Mark read",
                    onClick: () =>
                      markRead.mutate({
                        id: replyView.id,
                        read: !replyView.read,
                      }),
                  },
                  ...actions,
                ]}
              />
              {commentView && (
                <CommentVoting commentView={commentView} fixRightAlignment />
              )}
            </CommentButtonBar>
          </div>
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

export default function Inbox() {
  const media = useMedia();

  const paginationMode = useSettingsStore((s) => s.paginationMode);
  const type = useInboxStore((s) => s.inboxType);
  const setType = useInboxStore((s) => s.setInboxType);

  const isMergedTab = type === "all" || type === "unread";

  const replies = useReplies({
    unreadOnly: type === "unread",
  });
  const mentions = usePersonMentions({
    unreadOnly: type === "unread",
  });
  const postReports = usePostReportsQuery();
  const commentReports = useCommentReportsQuery();

  const repliesPagination = usePagination({
    pages: replies.data?.pages,
    getItems: (p) => p.replies.map((reply) => ({ reply, id: `r${reply.id}` })),
    fetchNextPage: replies.fetchNextPage,
    hasNextPage: replies.hasNextPage ?? false,
    isFetchingNextPage: replies.isFetchingNextPage,
    mode: isMergedTab ? "infinite" : paginationMode,
    listKey: type,
  });

  const mentionsPagination = usePagination({
    pages: mentions.data?.pages,
    getItems: (p) =>
      p.mentions.map((mention) => ({ mention, id: `m${mention.id}` })),
    fetchNextPage: mentions.fetchNextPage,
    hasNextPage: mentions.hasNextPage ?? false,
    isFetchingNextPage: mentions.isFetchingNextPage,
    mode: isMergedTab ? "infinite" : paginationMode,
    listKey: type,
  });

  const postReportsPagination = usePagination({
    pages: postReports.data?.pages,
    getItems: (p) =>
      p.postReports.map((postReport) => ({
        postReport,
        id: `pr${postReport.id}`,
      })),
    fetchNextPage: postReports.fetchNextPage,
    hasNextPage: postReports.hasNextPage ?? false,
    isFetchingNextPage: postReports.isFetchingNextPage,
    mode: isMergedTab ? "infinite" : paginationMode,
    listKey: type,
  });

  const commentReportsPagination = usePagination({
    pages: commentReports.data?.pages,
    getItems: (p) =>
      p.commentReports.map((commentReport) => ({
        commentReport,
        id: `cr${commentReport.id}`,
      })),
    fetchNextPage: commentReports.fetchNextPage,
    hasNextPage: commentReports.hasNextPage ?? false,
    isFetchingNextPage: commentReports.isFetchingNextPage,
    mode: isMergedTab ? "infinite" : paginationMode,
    listKey: type,
  });

  const activePagination =
    type === "replies"
      ? repliesPagination
      : type === "mentions"
        ? mentionsPagination
        : type === "post-reports"
          ? postReportsPagination
          : type === "comment-reports"
            ? commentReportsPagination
            : repliesPagination;

  // This updates in the background,
  // but calling it here ensures the
  // count is updated when the user visits
  // the inbox page.
  useNotificationCount();

  const markAllRead = useMarkAllRead();

  const { mergedData, isFetching } = useMemo(() => {
    const mergedData: (
      | { id: string; reply: Schemas.Reply }
      | { id: string; mention: Schemas.Mention }
      | { id: string; postReport: Schemas.PostReport }
      | { id: string; commentReport: Schemas.CommentReport }
    )[] = [];

    let isFetching = false;

    if (
      replies.data &&
      (type === "replies" || type === "all" || type === "unread")
    ) {
      mergedData.push(
        ...replies.data.pages
          .flatMap((p) => p.replies)
          .map((reply) => ({
            reply,
            id: `r${reply.id}`,
          })),
      );
      isFetching = isFetching || replies.isFetching;
    }

    if (
      mentions.data &&
      (type === "mentions" || type === "all" || type === "unread")
    ) {
      mergedData.push(
        ...(mentions.data?.pages
          .flatMap((p) => p.mentions)
          .map((mention) => ({
            mention,
            id: `m${mention.id}`,
          })) ?? []),
      );
      isFetching = isFetching || mentions.isFetching;
    }

    if (postReports.data && type === "post-reports") {
      mergedData.push(
        ...(postReports.data.pages
          .flatMap((p) => p.postReports)
          .map((postReport) => ({
            postReport,
            id: `pr${postReport.id}`,
          })) ?? []),
      );
      isFetching = isFetching || postReports.isFetching;
    }

    if (commentReports.data && type === "comment-reports") {
      mergedData.push(
        ...(commentReports.data.pages
          .flatMap((p) => p.commentReports)
          .map((commentReport) => ({
            commentReport,
            id: `cr${commentReport.id}`,
          })) ?? []),
      );
      isFetching = isFetching || commentReports.isFetching;
    }

    mergedData.sort((a, b) => {
      const aPublished =
        "reply" in a
          ? a.reply.createdAt
          : "mention" in a
            ? a.mention.createdAt
            : "postReport" in a
              ? a.postReport.createdAt
              : a.commentReport.createdAt;
      const bPublished =
        "reply" in b
          ? b.reply.createdAt
          : "mention" in b
            ? b.mention.createdAt
            : "postReport" in b
              ? b.postReport.createdAt
              : b.commentReport.createdAt;
      return bPublished.localeCompare(aPublished);
    });

    return {
      mergedData: _.uniqBy(mergedData, "id"),
      isFetching,
    };
  }, [
    type,
    replies.data,
    replies.isFetching,
    mentions.data,
    mentions.isFetching,
    postReports.data,
    postReports.isFetching,
    commentReports.data,
    commentReports.isFetching,
  ]);

  // For merged tabs, use combined mergedData directly. For single-query tabs, use pagination flatData.
  const displayData = isMergedTab ? mergedData : activePagination.flatData;

  const hasUnreadReply = !!replies.data?.pages
    .flatMap((pages) => pages.replies)
    .find((r) => !r.read);
  const hasUnreadMention = !!mentions.data?.pages
    .flatMap((pages) => pages.mentions)
    .find((r) => !r.read);
  const hasUnresolvedPostReport = !!postReports.data?.pages
    .flatMap((pages) => pages.postReports)
    .find((r) => !r.resolved);
  const hasUnresolvedCommentReport = !!commentReports.data?.pages
    .flatMap((pages) => pages.commentReports)
    .find((r) => !r.resolved);

  const confirmationAlrt = useConfirmationAlert();

  return (
    <Page requireLogin>
      <PageTitle>Inbox</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <MenuButton />
            <ToolbarTitle numRightIcons={1}>Inbox</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <IonButton
              onClick={() =>
                confirmationAlrt({
                  message: "Mark all replies and mentions as read",
                }).then(() => markAllRead.mutate())
              }
              className="md:hidden"
            >
              <DoubleCheck className="text-2xl" />
            </IonButton>
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
        {media.maxMd && (
          <IonToolbar>
            <ToolbarButtons side="left" className="overflow-x-auto!">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={type}
                onValueChange={(val) =>
                  val &&
                  setType(val as "all" | "unread" | "mentions" | "replies")
                }
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
                <BadgeCount showBadge={hasUnreadReply}>
                  <ToggleGroupItem value="replies">Replies</ToggleGroupItem>
                </BadgeCount>
                <BadgeCount showBadge={hasUnreadMention}>
                  <ToggleGroupItem value="mentions">Mentions</ToggleGroupItem>
                </BadgeCount>
                <BadgeCount showBadge={hasUnresolvedPostReport}>
                  <ToggleGroupItem value="post-reports">
                    Post Reports
                  </ToggleGroupItem>
                </BadgeCount>
                <BadgeCount showBadge={hasUnresolvedCommentReport}>
                  <ToggleGroupItem value="comment-reports">
                    Comment Reports
                  </ToggleGroupItem>
                </BadgeCount>
              </ToggleGroup>
            </ToolbarButtons>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent scrollY={false}>
        <VirtualList<Item>
          key={type}
          header={[
            <ContentGutters className="max-md:hidden" key="type-select-header">
              <div className="py-1.5 flex flex-row justify-between bg-background border-b-[.5px]">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={type}
                  onValueChange={(val) =>
                    val &&
                    setType(val as "all" | "unread" | "mentions" | "replies")
                  }
                >
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
                  <BadgeCount showBadge={hasUnreadReply}>
                    <ToggleGroupItem value="replies">Replies</ToggleGroupItem>
                  </BadgeCount>
                  <BadgeCount showBadge={hasUnreadMention}>
                    <ToggleGroupItem value="mentions">Mentions</ToggleGroupItem>
                  </BadgeCount>
                  <BadgeCount showBadge={hasUnresolvedPostReport}>
                    <ToggleGroupItem value="post-reports">
                      Post Reports
                    </ToggleGroupItem>
                  </BadgeCount>
                  <BadgeCount showBadge={hasUnresolvedCommentReport}>
                    <ToggleGroupItem value="comment-reports">
                      Comment Reports
                    </ToggleGroupItem>
                  </BadgeCount>
                </ToggleGroup>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => markAllRead.mutate()}
                    >
                      <DoubleCheck />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    Mark all replies and mentions as read
                  </TooltipContent>
                </Tooltip>
              </div>
              <></>
            </ContentGutters>,
          ]}
          stickyIndicies={[0]}
          data={displayData}
          noItems={displayData.length === 0 && !isFetching}
          noItemsComponent={
            <ContentGutters>
              <div className="flex-1 italic text-muted-foreground p-6 text-center">
                <span>No {type !== "all" ? type : "notifications"}</span>
              </div>
              <></>
            </ContentGutters>
          }
          paginationControls={
            isMergedTab ? undefined : activePagination.paginationControls
          }
          renderItem={({ item }) => {
            if ("commentReport" in item) {
              return <CommentReport commentReport={item.commentReport} />;
            }

            if ("postReport" in item) {
              return <PostReport postReport={item.postReport} />;
            }

            if ("reply" in item) {
              return <Reply replyView={item.reply} />;
            }

            if ("mention" in item) {
              return <Mention mention={item.mention} />;
            }

            return null;
          }}
          onEndReached={
            isMergedTab
              ? () => {
                  if (!replies.isFetchingNextPage && replies.hasNextPage) {
                    replies.fetchNextPage();
                  }
                  if (!mentions.isFetchingNextPage && mentions.hasNextPage) {
                    mentions.fetchNextPage();
                  }
                }
              : activePagination.onEndReached
          }
          estimatedItemSize={375}
          scrollHost
          refresh={replies.refetch}
          placeholder={<Placeholder />}
        />
      </IonContent>
    </Page>
  );
}
