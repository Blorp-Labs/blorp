import { PostComment } from "@/src/components/posts/post-comment";
import { buildCommentTree } from "../lib/comment-tree";
import { useEffect } from "react";
import { usePost, useComments, useCommunity } from "@/src/lib/api/index";
import {
  PostBottomBar,
  FeedPostCard,
  PostProps,
  PostCardSkeleton,
} from "@/src/components/posts/post";
import { CommunitySidebar } from "@/src/components/communities/community-sidebar";
import { ContentGutters } from "../components/gutters";
import { memo, useMemo } from "react";
import _ from "lodash";
import { useState } from "react";
import {
  CommentReplyProvider,
  InlineCommentReply,
  useCommentEditingState,
  useLoadCommentIntoEditor,
} from "../components/comments/comment-reply-modal";
import { getAccountSite, useAuth } from "../stores/auth";
import { VirtualList } from "../components/virtual-list";
import { PostReportProvider } from "../components/posts/post-report";
import { usePostsStore } from "../stores/posts";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { resolveRoute, useParams } from "@/src/routing/index";
import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import {
  useHideTabBarOnMount,
  useIonPageElement,
  useMedia,
  useTheme,
} from "../lib/hooks";
import { NotFound } from "./not-found";
import { CommentSkeleton } from "../components/comments/comment-skeleton";
import { useLinkContext } from "../routing/link-context";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { CommentSortSelect } from "../components/lemmy-sort";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { cn } from "../lib/utils";
import { SearchBar } from "./search/search-bar";

function SafeAreaBottom() {
  return <div className="h-safe-area-bottom bg-background" />;
}

const MemoedPostComment = memo(PostComment);

const EMPTY_ARR: never[] = [];

function useDelayedReady(delay: number) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setIsReady(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return isReady;
}

const MemoedPostCard = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <FeedPostCard {...props} detailView />
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
        <PostBottomBar
          apId={postApId}
          commentsCount={commentCount}
          onReply={() =>
            loadCommentIntoEditor({
              postApId: postApId,
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
  return (
    <ContentGutters className={cn("md:pb-2 md:pt-5 bg-background", className)}>
      <div className="flex-1">
        {postReplyState && media.md ? (
          <InlineCommentReply state={postReplyState} autoFocus={media.md} />
        ) : (
          <button
            className="py-2 max-md:py-4.5 md:px-3 md:border md:rounded-2xl w-full text-left text-muted-foreground md:text-sm"
            onClick={() =>
              loadCommentIntoEditor({
                postApId,
              })
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

export default function Post() {
  useHideTabBarOnMount();

  const theme = useTheme();
  const media = useMedia();
  const linkCtx = useLinkContext();
  const {
    communityName,
    post: apId,
    comment: commentPath,
  } = useParams(
    `${linkCtx.root}c/:communityName/posts/:post/comments/:comment`,
  );
  const [search, setSearch] = useState("");

  const decodedApId = apId ? decodeURIComponent(apId) : undefined;

  const commentPathArr = commentPath?.split(".") ?? [];
  const [commentId] = commentPathArr;
  const highlightCommentId = commentPathArr.at(-1);

  const myUserId = useAuth((s) => getAccountSite(s.getSelectedAccount()))?.me
    ?.id;

  const community = useCommunity({
    name: communityName,
  });
  const modApIds = community.data?.mods.map((m) => m.apId);
  const postQuery = usePost({
    ap_id: decodedApId,
  });

  const adminApIds = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.admins,
  )?.map((a) => a.apId);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore((s) =>
    decodedApId ? s.posts[getCachePrefixer()(decodedApId)]?.data : null,
  );

  const parentId = commentId ? +commentId : undefined;

  const comments = useComments({
    postApId: decodedApId,
    parentId: parentId,
  });

  const isReady = useDelayedReady(500);

  const allComments = useMemo(
    () =>
      comments.data?.pages && isReady
        ? comments.data.pages.map((p) => p.comments).flat()
        : EMPTY_ARR,
    [comments.data?.pages, isReady],
  );

  const structured = useMemo(() => {
    if (!isReady) {
      return null;
    }
    const map = buildCommentTree(allComments, commentId);
    const topLevelItems = _.entries(map).sort(
      ([_id1, a], [_id2, b]) => a.sort - b.sort,
    );
    return { map, topLevelItems };
  }, [allComments, isReady, commentId]);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (refreshing || !isReady) {
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

  if (!decodedApId || (postQuery.isError && !post)) {
    return <NotFound />;
  }

  const opId = post?.creatorId;

  return (
    <IonPage ref={pageElement.ref}>
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
              {communityName}
            </ToolbarTitle>
          </ToolbarButtons>
          <SearchBar
            placeholder={`Search ${communityName}`}
            value={search}
            onValueChange={setSearch}
            onSubmit={(newVal) => {
              router.push(
                resolveRoute(
                  `${linkCtx.root}c/:communityName/s`,
                  {
                    communityName,
                  },
                  `?s=${newVal ?? search}`,
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
      <IonContent scrollY={false}>
        <CommentReplyProvider presentingElement={pageElement.element}>
          <PostReportProvider>
            <div className="flex flex-col-reverse h-full">
              {/* Reversing these might be a bad idea, but I didn't */}
              {/* want keyboard users to have to tab through all comments */}
              {/* to reach the reply field */}
              {post && !commentPath && (
                <div key="reply-to-post">
                  <ReplyToPost
                    postApId={post.apId}
                    className="md:hidden border-t"
                  />
                  <SafeAreaBottom />
                </div>
              )}
              <VirtualList
                keepMountedIndices={[0]}
                className="h-full ion-content-scroll-host"
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
                  post && (
                    <PostBottomBarWithCtx
                      key="post-bottom-bar"
                      postApId={post.apId}
                      commentCount={post.commentsCount}
                    />
                  ),
                  post && !commentPath && (
                    <ReplyToPost
                      key="reply-to-post"
                      postApId={post.apId}
                      className="max-md:hidden"
                    />
                  ),
                  <CommentSortBar key="comment-sort-bar" />,
                ]}
                renderItem={({ item }) => (
                  <>
                    <MemoedPostComment
                      highlightCommentId={highlightCommentId}
                      postApId={decodedApId}
                      queryKeyParentId={parentId}
                      commentTree={item[1]}
                      level={0}
                      opId={opId}
                      myUserId={myUserId}
                      communityName={communityName}
                      modApIds={modApIds}
                      adminApIds={adminApIds}
                      singleCommentThread={!!commentPath}
                    />
                    {commentPath && <SafeAreaBottom />}
                  </>
                )}
                placeholder={
                  comments.isPending || !isReady ? (
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
                stickyHeaderIndices={[1]}
                refresh={refresh}
              />
            </div>
          </PostReportProvider>
        </CommentReplyProvider>

        <ContentGutters className="max-md:hidden absolute top-0 right-0 left-0 z-10">
          <div className="flex-1" />
          {communityName && (
            <CommunitySidebar
              communityName={communityName}
              actorId={community.data?.community.apId}
            />
          )}
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
