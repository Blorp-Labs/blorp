import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import { ContentGutters } from "../components/gutters";
import { memo, useMemo } from "react";
import { usePagination } from "../components/pagination/use-pagination";
import { useSettingsStore } from "../stores/settings";
import { VirtualList } from "../components/virtual-list";
import { useAvailableSorts, useComments, usePosts } from "../api";
import { PostReportProvider } from "../components/posts/post-report";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import _ from "lodash";
import { useCommentsByPaths } from "../stores/comments";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { useLinkContext } from "../routing/link-context";
import { encodeApId } from "../api/utils";
import { Link } from "@/src/routing/index";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useMedia, useUrlSearchState } from "../hooks";
import z from "zod";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { StickyFilterBar } from "../components/sticky-filter-bar";
import { Page } from "../components/page";

function NothingSavedMessage() {
  return (
    <ContentGutters>
      <div className="flex-1 italic text-muted-foreground p-6 text-center">
        <span>Nothing saved yet</span>
      </div>
      <></>
    </ContentGutters>
  );
}

const Post = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} />
    <></>
  </ContentGutters>
));

function Comment({ path }: { path: string }) {
  const [commentView] = useCommentsByPaths([path]);
  const linkCtx = useLinkContext();

  if (!commentView) {
    return null;
  }

  return (
    <Link
      className="border-b pb-4 mt-4"
      to={`${linkCtx.root}c/:communityName/posts/:post/comments/:comment`}
      params={{
        communityName: commentView.communitySlug,
        post: encodeApId(commentView.postApId),
        comment: encodeApId(commentView.apId),
      }}
    >
      <MarkdownRenderer markdown={commentView.body} disableLinks />
    </Link>
  );
}

export default function SavedContent() {
  const media = useMedia();

  const typeParam = useUrlSearchState(
    "type",
    "posts",
    z.enum(["posts", "comments"]),
  );
  const type = typeParam.value;

  const paginationMode = useSettingsStore((s) => s.paginationMode);

  const comments = useComments({
    savedOnly: true,
    maxDepth: undefined,
    sort: "New",
  });

  const { postSort } = useAvailableSorts();
  const posts = usePosts({
    savedOnly: true,
    type: "All",
  });

  const { refetch } = posts;

  const postsPagination = usePagination({
    pages: posts.data?.pages,
    getItems: (p) => p.posts,
    fetchNextPage: posts.fetchNextPage,
    hasNextPage: posts.hasNextPage ?? false,
    isFetchingNextPage: posts.isFetchingNextPage,
    mode: paginationMode,
    listKey: "posts" + postSort,
  });

  const commentsPagination = usePagination({
    pages: comments.data?.pages,
    getItems: (p) => p.comments,
    fetchNextPage: comments.fetchNextPage,
    hasNextPage: comments.hasNextPage ?? false,
    isFetchingNextPage: comments.isFetchingNextPage,
    mode: paginationMode,
    listKey: "comments",
  });

  const activePagination =
    type === "posts" ? postsPagination : commentsPagination;

  const data = useMemo(() => {
    if (type === "posts") {
      return _.uniq(postsPagination.flatData);
    } else {
      return _.uniq(commentsPagination.flatData);
    }
  }, [type, postsPagination.flatData, commentsPagination.flatData]);

  return (
    <Page>
      <PageTitle>Saved</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1}>Saved</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
        {media.maxMd && (
          <IonToolbar>
            <ToolbarButtons side="left">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={type}
                onValueChange={(val) =>
                  val && typeParam.set(val as "posts" | "comments")
                }
              >
                <ToggleGroupItem value="posts">Posts</ToggleGroupItem>
                <ToggleGroupItem value="comments">Comments</ToggleGroupItem>
              </ToggleGroup>
            </ToolbarButtons>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent scrollY={false} fullscreen={media.maxMd}>
        <PostReportProvider>
          <VirtualList
            key={type === "comments" ? "comments" : type + postSort}
            fullscreen
            scrollHost
            data={data}
            header={[
              <StickyFilterBar
                key="header-type-select"
                className="max-md:hidden"
              >
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={type}
                  onValueChange={(val) =>
                    val && typeParam.set(val as "posts" | "comments")
                  }
                >
                  <ToggleGroupItem value="posts">Posts</ToggleGroupItem>
                  <ToggleGroupItem value="comments">Comments</ToggleGroupItem>
                </ToggleGroup>
              </StickyFilterBar>,
            ]}
            noItems={
              data.length === 0 &&
              !(type === "posts" ? posts.isFetching : comments.isFetching)
            }
            noItemsComponent={<NothingSavedMessage />}
            paginationControls={activePagination.paginationControls}
            renderItem={({ item }) => {
              if (type === "posts") {
                return <Post apId={item} />;
              }

              return (
                <ContentGutters>
                  <Comment path={item} />
                  <></>
                </ContentGutters>
              );
            }}
            onEndReached={activePagination.onEndReached}
            estimatedItemSize={475}
            stickyIndicies={[0]}
            refresh={refetch}
            placeholder={
              posts.isFetching ? (
                <ContentGutters className="px-0">
                  <PostCardSkeleton />
                  <></>
                </ContentGutters>
              ) : undefined
            }
          />
        </PostReportProvider>
      </IonContent>
    </Page>
  );
}
