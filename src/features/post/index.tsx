import { PostComment } from "@/src/components/comments/post-comment";
import {
  buildCommentTree,
  getCommentChildren,
  getCommentDepth,
} from "../../lib/comment-tree";
import { memo, useMemo, useState } from "react";
import {
  usePostQuery,
  useCommentsQuery,
  useCommunityQuery,
  useResolveObjectQuery,
} from "@/src/queries/index";
import {
  StickyPostHeader,
  PostCard,
  PostProps,
  PostCardSkeleton,
} from "@/src/components/posts/post";
import { CommunitySidebar } from "@/src/components/communities/community-sidebar";
import { ContentGutters } from "../../components/gutters";
import _ from "lodash";
import {
  CommentReplyProvider,
  InlineCommentReply,
  useCommentEditingState,
  useLoadCommentIntoEditor,
} from "../../components/comments/comment-reply-modal";
import { getAccountSite, useAmIAdmin, useAuth } from "../../stores/auth";
import { VirtualList } from "../../components/virtual-list";
import { PostReportProvider } from "../../components/posts/post-report";
import { usePostFromStore } from "../../stores/posts";
import { IonContent, IonHeader, IonToolbar, useIonRouter } from "@ionic/react";
import { resolveRoute, useParams } from "@/src/routing/index";
import { UserDropdown } from "../../components/nav";
import { PageTitle } from "../../components/page-title";
import {
  useHideTabBarOnMount,
  useIonPageElement,
  useMedia,
  useTheme,
  useRequireAuth,
} from "../../hooks";
import { Page } from "../../components/page";
import { CommentSkeleton } from "../../components/comments/comment-skeleton";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { ToolbarTitle } from "../../components/toolbar/toolbar-title";
import { CommentSortSelect } from "../../components/lemmy-sort";
import { ToolbarBackButton } from "../../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../../components/toolbar/toolbar-buttons";
import { cn } from "../../lib/utils";
import { SearchBar } from "../search/search-bar";
import { useCommentsByPaths } from "../../stores/comments";
import { useCommunityFromStore } from "../../stores/communities";
import { useQueryToast } from "../../hooks/use-query-toast";
import { MissingComment } from "./missing-comment";

function SafeAreaBottom() {
  return <div className="h-safe-area-bottom bg-background" />;
}

const MemoedPostComment = memo(PostComment);

const EMPTY_ARR: never[] = [];

const MemoedPostCard = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} detailView />
    <></>
  </ContentGutters>
));

function PostBottomBarWithCtx({
  postApId,
  commentCount,
}: {
  postApId: string;
  commentCount: number;
}) {
  const loadCommentIntoEditor = useLoadCommentIntoEditor();
  return (
    <>
      <ContentGutters className="px-0">
        <StickyPostHeader
          apId={postApId}
          commentsCount={commentCount}
          onReply={() =>
            loadCommentIntoEditor({
              postApId,
            })
          }
        />
        <></>
      </ContentGutters>
    </>
  );
}

function ReplyToPost({
  postApId,
  className,
}: {
  postApId: string;
  className?: string;
}) {
  const postReplyState = useCommentEditingState({
    postApId,
  });
  const loadCommentIntoEditor = useLoadCommentIntoEditor();
  const media = useMedia();
  const requireAuth = useRequireAuth();
  return (
    <ContentGutters className={cn("md:pb-2 md:pt-5 bg-background", className)}>
      <div className="flex-1">
        {postReplyState && media.md ? (
          <InlineCommentReply state={postReplyState} autoFocus={media.md} />
        ) : (
          <button
            className="py-2 max-md:py-4.5 md:px-3 md:border max-md:rounded-none rounded-full w-full text-left text-muted-foreground md:text-sm"
            onClick={() =>
              requireAuth().then(() =>
                loadCommentIntoEditor({
                  postApId,
                }),
              )
            }
          >
            Add a comment
          </button>
        )}
      </div>
      <></>
    </ContentGutters>
  );
}

function CommentSortBar() {
  return (
    <ContentGutters className="max-md:hidden">
      <div className="flex-1 pb-3">
        <span className="text-sm">Comment sort: </span>
        <CommentSortSelect variant="button" />
      </div>
    </ContentGutters>
  );
}

/**
 * For backwards compatibility, comments have to be resolvable via
 * ../comment/[comment.child], but moving fowards, they will be resolve
 * via ../comment/[commentApId]
 */
function useResolveComment(pathOrApId: string | undefined): {
  commentId: string | undefined;
  highlightCommentId: string | undefined;
  status: "pending" | "error" | "success";
} {
  const decoded = pathOrApId ? decodeURIComponent(pathOrApId) : undefined;

  const { apId, commentId, highlightCommentId } = useMemo(() => {
    const noResult = {
      apId: undefined,
      commentId: undefined,
      highlightCommentId: undefined,
    };

    if (!decoded) {
      return noResult;
    }

    try {
      new URL(decoded);
      return {
        ...noResult,
        apId: decoded,
      };
    } catch {}

    try {
      const commentPathArr = decoded?.split(".") ?? [];
      const [commentId] = commentPathArr;
      const highlightCommentId = commentPathArr.at(-1);
      return {
        ...noResult,
        commentId,
        highlightCommentId,
      };
    } catch {}

    return noResult;
  }, [decoded]);

  const object = useResolveObjectQuery({ q: apId });
  useQueryToast(object, {
    error: "Couldn't resolve comment",
  });

  if (apId) {
    const comment = object.data?.comment;
    const highlightCommentId = comment ? String(comment.id) : null;
    const commentId = comment?.path.split(".").at(-2);
    if (highlightCommentId) {
      return {
        highlightCommentId,
        commentId:
          commentId && commentId !== "0" ? commentId : highlightCommentId,
        status: object.status,
      };
    }
    return {
      commentId: undefined,
      highlightCommentId: undefined,
      status: object.status,
    };
  }

  return {
    commentId,
    highlightCommentId,
    status: "success",
  };
}

export default function Post() {
  useHideTabBarOnMount();

  const theme = useTheme();
  const media = useMedia();
  const linkCtx = useLinkContext();
  const { post: apId, comment: commentPath } = useParams(
    `${linkCtx.root}posts/:post/comments/:comment`,
  );
  const [search, setSearch] = useState("");

  const decodedApId = apId ? decodeURIComponent(apId) : undefined;

  const parentComment = useResolveComment(commentPath);

  const myUserApId = useAuth((s) => getAccountSite(s.getSelectedAccount()))?.me
    ?.apId;

  const amIAdmin = useAmIAdmin();

  const postQuery = usePostQuery({
    ap_id: decodedApId,
  });

  const post = usePostFromStore(decodedApId ?? undefined);

  const communityHandle = post?.communityHandle;

  useCommunityQuery({
    name: communityHandle,
  });
  const community = useCommunityFromStore(communityHandle);
  const modApIds = community?.mods?.map((m) => m.apId);
  const canMod =
    (myUserApId ? modApIds?.includes(myUserApId) : false) || !!amIAdmin;

  const locked = post?.optimisticLocked ?? post?.locked ?? false;

  const parentId = parentComment.commentId
    ? +parentComment.commentId
    : undefined;

  const comments = useCommentsQuery(
    {
      postApId: decodedApId ?? "",
      parentId,
    },
    {
      enabled: parentComment.status === "success" && !!decodedApId,
    },
  );

  const isPending =
    parentComment.status === "error"
      ? false
      : parentComment.status === "pending" || comments.isPending;

  const allCommentPaths = useMemo(
    () =>
      comments.data?.pages && parentComment.status === "success"
        ? comments.data.pages.map((p) => p.comments).flat()
        : EMPTY_ARR,
    [comments.data?.pages, parentComment.status],
  );

  const commentsData = comments.data;
  const pathToCursor = useMemo(() => {
    const result = new Map<string, string | number>();
    if (commentsData?.pages) {
      commentsData.pages.forEach((p, i) => {
        const cursor = commentsData.pageParams[i] as string | number;
        p.comments.forEach((path) => {
          // We want to find the first occurance,
          // so checking has is really important
          if (!result.has(path)) {
            result.set(path, cursor);
          }
        });
      });
    }
    return result;
  }, [commentsData]);

  const allComments = useCommentsByPaths(allCommentPaths);
  const structured = useMemo(() => {
    const parentCommentId = parentComment.commentId;
    const parentCommentView = _.isNil(parentCommentId)
      ? undefined
      : allComments.find((c) => c.id === +parentCommentId);
    const colorIndexOffset = parentCommentView
      ? getCommentDepth(parentCommentView.path)
      : 0;

    const map = buildCommentTree(allComments, {
      threadRootId: parentComment.commentId,
      selectedCommentId: parentComment.highlightCommentId,
      getCommentPageCursor: (comment) => pathToCursor.get(comment.path),
      colorIndexOffset,
    });
    const topLevelItems = getCommentChildren(map);
    return { map, topLevelItems };
  }, [
    allComments,
    parentComment.commentId,
    parentComment.highlightCommentId,
    pathToCursor,
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    await Promise.all([postQuery.refetch(), comments.refetch()]);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (comments.hasNextPage && !comments.isFetchingNextPage) {
      comments.fetchNextPage();
    }
  };

  const data = useMemo(
    () => (structured ? structured.topLevelItems : EMPTY_ARR),
    [structured],
  );

  const pageElement = useIonPageElement();

  const router = useIonRouter();

  const [commentReplyParent, setCommentReplyParent] = useState<string | null>();
  const replyingToItem = data.find(
    ([path]) => commentReplyParent?.includes(String(path)) ?? false,
  );

  const postCreatorId = post?.creatorId;

  const showMobileReply = post && !commentPath && media.maxMd;

  return (
    <Page
      ref={pageElement.ref}
      notFound={!decodedApId || (postQuery.isError && !post)}
      notFoundApId={decodedApId}
    >
      <PageTitle>{post?.title ?? "Post"}</PageTitle>
      <IonHeader>
        <IonToolbar
          data-tauri-drag-region
          className="max-md:text-white"
          style={
            media.maxMd
              ? theme === "light"
                ? {
                    "--background": "var(--color-brand-secondary)",
                    "--border-color": "var(--color-brand-secondary)",
                  }
                : {
                    "--border-color": "var(--color-background)",
                  }
              : undefined
          }
        >
          <ToolbarButtons side="left">
            <ToolbarBackButton className="max-md:text-white max-md:dark:text-muted-foreground" />
            <ToolbarTitle className="md:hidden" size="sm" numRightIcons={2}>
              {communityHandle ?? "Loading..."}
            </ToolbarTitle>
          </ToolbarButtons>
          <SearchBar
            placeholder={
              communityHandle ? `Search ${communityHandle}` : "Search"
            }
            value={search}
            onValueChange={setSearch}
            onSubmit={(newVal) => {
              if (!communityHandle) {
                return;
              }
              router.push(
                resolveRoute(
                  `${linkCtx.root}c/:communityHandle/s`,
                  {
                    communityHandle,
                  },
                  `?q=${newVal ?? search}`,
                ),
              );
            }}
            className="max-md:hidden"
          />
          <ToolbarButtons side="right">
            <CommentSortSelect
              variant="icon"
              className="text-white dark:text-muted-foreground md:hidden"
            />
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} fullscreen={media.maxMd}>
        <CommentReplyProvider
          presentingElement={pageElement.element}
          onStateChange={(state) => setCommentReplyParent(state?.parent?.path)}
        >
          <PostReportProvider>
            <VirtualList
              keepMounted={[replyingToItem]}
              fullscreen
              scrollHost
              className={cn(
                showMobileReply &&
                  "max-md:pb-[calc(var(--ion-safe-area-bottom)+55px)]",
              )}
              data={data}
              header={[
                post ? (
                  <MemoedPostCard
                    key="post-details"
                    apId={post.apId}
                    featuredContext="community"
                    detailView
                    modApIds={modApIds}
                  />
                ) : (
                  <ContentGutters className="px-0" key="post-skeleton">
                    <PostCardSkeleton hideImage={false} detailView />
                    <></>
                  </ContentGutters>
                ),
                post && !refreshing && (
                  <PostBottomBarWithCtx
                    key="post-bottom-bar"
                    postApId={post.apId}
                    commentCount={post.commentsCount}
                  />
                ),
                post && !locked && !commentPath && media.md && (
                  <ReplyToPost key="reply-to-post" postApId={post.apId} />
                ),
                <CommentSortBar key="comment-sort-bar" />,
              ]}
              renderItem={({ item }) => (
                <>
                  <MemoedPostComment
                    highlightCommentId={parentComment.highlightCommentId}
                    postApId={decodedApId!}
                    postLocked={locked}
                    queryKeyParentId={parentId}
                    commentTree={item[1]}
                    level={0}
                    postCreatorId={postCreatorId}
                    modApIds={modApIds}
                    singleCommentThread={!!commentPath}
                    canMod={canMod}
                    renderMissingComment={(path) => (
                      <MissingComment postApId={decodedApId!} path={path} />
                    )}
                  />
                  {commentPath && <SafeAreaBottom />}
                </>
              )}
              placeholder={
                isPending ? (
                  <ContentGutters className="px-0">
                    <CommentSkeleton />
                    <></>
                  </ContentGutters>
                ) : undefined
              }
              numPlaceholders={
                _.isNumber(post?.commentsCount)
                  ? Math.max(1, post.commentsCount)
                  : undefined
              }
              onEndReached={loadMore}
              estimatedItemSize={450}
              stickyIndicies={[1]}
              refresh={refresh}
            />
            {showMobileReply && !locked && (
              <div className="z-20 absolute bottom-0 inset-x-0">
                <ReplyToPost postApId={post.apId} className="border-t" />
                <SafeAreaBottom />
              </div>
            )}
          </PostReportProvider>
        </CommentReplyProvider>

        <ContentGutters className="max-md:hidden absolute top-0 right-0 left-0 z-10">
          <div className="flex-1" />
          {communityHandle && (
            <CommunitySidebar
              communityHandle={communityHandle}
              actorId={community?.communityView.apId}
              postApId={post?.apId}
            />
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
