import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import { ContentGutters } from "../components/gutters";
import { memo, useMemo } from "react";
import { VirtualList } from "../components/virtual-list";
import { useAvailableSorts, useComments, usePosts } from "../lib/api";
import { PostReportProvider } from "../components/posts/post-report";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import _ from "lodash";
import { useCommentsStore } from "../stores/comments";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { useLinkContext } from "../routing/link-context";
import { encodeApId } from "../lib/api/utils";
import { Link } from "@/src/routing/index";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useAuth } from "../stores/auth";
import { useMedia, useUrlSearchState } from "../lib/hooks";
import z from "zod";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";

const EMPTY_ARR: never[] = [];

const NO_ITEMS = "NO_ITEMS";
type Item = string;

const Post = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} />
    <></>
  </ContentGutters>
));

function Comment({ path }: { path: string }) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const commentView = useCommentsStore(
    (s) => s.comments[getCachePrefixer()(path)]?.data,
  );
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

  const [type, setType] = useUrlSearchState(
    "type",
    "posts",
    z.enum(["posts", "comments"]),
  );

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

  const { hasNextPage, fetchNextPage, isFetchingNextPage, refetch } = posts;

  const data = useMemo(() => {
    const commentViews =
      _.uniq(comments.data?.pages.map((res) => res.comments).flat()) ??
      EMPTY_ARR;

    const postIds =
      _.uniq(posts.data?.pages.flatMap((res) => res.posts)) ?? EMPTY_ARR;

    switch (type) {
      case "posts":
        return postIds;
      case "comments":
        return commentViews;
    }
  }, [posts.data?.pages, comments.data?.pages, type]);

  return (
    <IonPage>
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
                  val && setType(val as "posts" | "comments")
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
          <VirtualList<Item>
            key={type === "comments" ? "comments" : type + postSort}
            fullscreen
            scrollHost
            data={
              data.length === 0 && !posts.isRefetching && !posts.isPending
                ? [NO_ITEMS]
                : data
            }
            header={[
              <ContentGutters
                className="max-md:hidden"
                key="header-type-select"
              >
                <div className="flex flex-row md:h-12 md:border-b md:bg-background flex-1 items-center">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={type}
                    onValueChange={(val) =>
                      val && setType(val as "posts" | "comments")
                    }
                  >
                    <ToggleGroupItem value="posts">Posts</ToggleGroupItem>
                    <ToggleGroupItem value="comments">Comments</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <></>
              </ContentGutters>,
            ]}
            renderItem={({ item }) => {
              if (item === NO_ITEMS) {
                return (
                  <ContentGutters>
                    <div className="flex-1 italic text-muted-foreground p-6 text-center">
                      <span>Nothing saved yet</span>
                    </div>
                    <></>
                  </ContentGutters>
                );
              }

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
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            estimatedItemSize={475}
            stickyIndicies={[0]}
            refresh={refetch}
            placeholder={
              posts.isPending ? (
                <ContentGutters className="px-0">
                  <PostCardSkeleton />
                  <></>
                </ContentGutters>
              ) : undefined
            }
          />
        </PostReportProvider>
      </IonContent>
    </IonPage>
  );
}
