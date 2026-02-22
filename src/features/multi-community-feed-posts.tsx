import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import { ContentGutters } from "../components/gutters";
import { Fragment, memo, useMemo, useState } from "react";
import { usePagination } from "../lib/hooks/use-pagination";
import { useSettingsStore } from "../stores/settings";
import { VirtualList } from "../components/virtual-list";
import { useAvailableSorts, useMostRecentPost, usePosts } from "../lib/api";
import { PostReportProvider } from "../components/posts/post-report";
import _ from "lodash";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { resolveRoute, useParams } from "@/src/routing/index";
import { MultiCommunityFeedBanner } from "../components/multi-community-feeds/multi-community-feed-banner";
import {
  FeedSidebar,
  SmallScreenSidebar,
} from "../components/multi-community-feeds/multi-community-feed-sidebar";
import { UserDropdown } from "../components/nav";
import { PostSortButton } from "../components/lemmy-sort";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "../routing/link-context";
import { Link } from "@/src/routing/index";
import { useFiltersStore } from "../stores/filters";
import { Button } from "../components/ui/button";
import { dispatchScrollEvent } from "../lib/scroll-events";
import { LuLoaderCircle } from "react-icons/lu";
import { FaArrowUp } from "react-icons/fa6";
import { useMedia } from "../lib/hooks";
import { CommunityPostSortBar } from "../components/communities/community-post-sort-bar";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useAuth, useIsCommunityBlocked } from "../stores/auth";
import { usePostsStore } from "../stores/posts";
import { Search } from "../components/icons";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";
import { Separator } from "../components/ui/separator";
import { decodeApId } from "../lib/api/utils";
import { useMultiCommunityFeedFromStore } from "../stores/multi-community-feeds";
import { NoPostsMessage } from "../components/posts/no-posts-message";

const Post = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} featuredContext="feed" />
    <></>
  </ContentGutters>
));

export default function MultiCommunityFeedPosts() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const router = useIonRouter();
  const [search, setSearch] = useState("");

  const { apId: apIdEncoded } = useParams(`${linkCtx.root}f/:apId`);
  const apId = useMemo(() => decodeApId(apIdEncoded), [apIdEncoded]);

  const feed = useMultiCommunityFeedFromStore(apId);

  const paginationMode = useSettingsStore((s) => s.paginationMode);
  const { postSort, suggestedPostSort } = useAvailableSorts();
  const setPostSort = useFiltersStore((s) => s.setPostSort);
  const posts = usePosts({
    multiCommunityFeedApId: apId,
    multiCommunityFeedId: feed?.id,
  });

  const mostRecentPost = useMostRecentPost("community", {
    multiCommunityFeedApId: apId,
    multiCommunityFeedId: feed?.id,
  });

  const isBlocked = useIsCommunityBlocked(apId);

  const {
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = posts;

  const { flatData, onEndReached, paginationControls } = usePagination({
    pages: posts.data?.pages,
    getItems: (p) => p.posts,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    mode: paginationMode,
    listKey: postSort,
  });

  const data = useMemo(() => _.uniq(flatData), [flatData]);

  const mostRecentPostApId = mostRecentPost?.data;
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const hasNewPost = usePostsStore((s) =>
    mostRecentPostApId
      ? !(getCachePrefixer()(mostRecentPostApId) in s.posts)
      : false,
  );

  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), mostRecentPost.refetch()]);
    setRefreshing(false);
  };

  return (
    <IonPage>
      <PageTitle>{feed?.slug ?? apId}</PageTitle>
      <IonHeader>
        <IonToolbar
          data-tauri-drag-region
          style={
            media.maxMd
              ? {
                  "--border-color": "var(--color-background)",
                }
              : undefined
          }
        >
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" className="md:hidden" numRightIcons={3}>
              {feed?.slug ?? apId}
            </ToolbarTitle>
          </ToolbarButtons>
          <SearchBar
            placeholder={`Search ${apId}`}
            value={search}
            onValueChange={setSearch}
            communitySlug={apId}
            onSubmit={(newVal) => {
              router.push(
                resolveRoute(
                  `${linkCtx.root}c/:communityName/s`,
                  {
                    communityName: apId,
                  },
                  `?q=${newVal ?? search}`,
                ),
              );
            }}
            className="max-md:hidden"
          />
          <ToolbarButtons side="right">
            <Link
              to={`${linkCtx.root}c/:communityName/s`}
              params={{
                communityName: apId,
              }}
              className="text-2xl contents md:hidden"
            >
              <Search className="scale-110 text-muted-foreground" />
            </Link>
            <div className="md:hidden contents">
              <PostSortButton align="end" className="text-muted-foreground" />
            </div>
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>

        {hasNewPost && (
          <ContentGutters className="absolute mt-2 inset-x-0">
            <div className="flex flex-row justify-center flex-1">
              <Button
                variant="outline"
                size="sm"
                className="absolute"
                onClick={() => {
                  refetch();
                  // This is a hack to send you to the top of the feed
                  dispatchScrollEvent(router.routeInfo.pathname);
                }}
              >
                New posts
                {isRefetching ? (
                  <LuLoaderCircle className="animate-spin" />
                ) : (
                  <FaArrowUp />
                )}
              </Button>
            </div>
            <></>
          </ContentGutters>
        )}
      </IonHeader>
      <IonContent scrollY={false} fullscreen={media.maxMd}>
        <PostReportProvider>
          <VirtualList
            key={postSort}
            fullscreen
            scrollHost
            data={data}
            stickyIndicies={[1]}
            header={[
              <Fragment key="community-header">
                <SmallScreenSidebar apId={apId} />
                <ContentGutters className="max-md:hidden pt-4">
                  <MultiCommunityFeedBanner apId={apId} />
                  <></>
                </ContentGutters>
              </Fragment>,
              <Fragment key="community-sort-bar">
                <CommunityPostSortBar communityName={apId} />
                {!refreshing && (
                  <Separator className="[[data-is-sticky-header=false]_&]:opacity-1 data-[orientation=horizontal]:h-[0.5px] md:hidden" />
                )}
              </Fragment>,
            ]}
            noItems={isBlocked || (data.length === 0 && !posts.isFetching)}
            noItemsComponent={
              <NoPostsMessage
                isBlocked={isBlocked}
                blockedName={apId}
                postSort={postSort}
                suggestedPostSort={suggestedPostSort}
                setPostSort={setPostSort}
              />
            }
            paginationControls={paginationControls}
            renderItem={({ item }) => (
              <Post apId={item} featuredContext="community" />
            )}
            onEndReached={onEndReached}
            estimatedItemSize={475}
            refresh={refresh}
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

        <ContentGutters className="max-md:hidden absolute top-0 right-0 left-0 z-10">
          <div className="flex-1" />
          <FeedSidebar apId={apId} />
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
