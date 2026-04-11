import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import {
  CommunitySidebar,
  SmallScreenSidebar,
} from "@/src/components/communities/community-sidebar";
import { ContentGutters } from "../components/gutters";
import { Fragment, memo, useMemo, useState } from "react";
import { usePagination } from "../components/pagination/use-pagination";
import { useSettingsStore } from "../stores/settings";
import { VirtualList } from "../components/virtual-list";
import {
  useAvailableSortsQuery,
  useCommunityQuery,
  useMostRecentPostQuery,
  usePostsQuery,
} from "../queries";
import { PostReportProvider } from "../components/posts/post-report";
import _ from "lodash";
import { IonContent, IonHeader, IonToolbar, useIonRouter } from "@ionic/react";
import { resolveRoute, useParams, Link } from "@/src/routing/index";
import { CommunityBanner } from "../components/communities/community-banner";
import { useUpdateRecentCommunity } from "../hooks/use-update-recent-communities";
import { UserDropdown } from "../components/nav";
import { PostSortButton } from "../components/lemmy-sort";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { Button } from "../components/ui/button";
import { dispatchScrollEvent } from "../lib/scroll-events";
import { LuLoaderCircle } from "react-icons/lu";
import { FaArrowUp } from "react-icons/fa6";
import { useMedia } from "../hooks";
import { CommunityPostSortBar } from "../components/communities/community-post-sort-bar";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import {
  useAuth,
  useIsCommunityBlocked,
  useIsInstanceBlocked,
} from "../stores/auth";
import { useFiltersStore } from "../stores/filters";
import { usePostsStore } from "../stores/posts";
import { Search } from "../components/icons";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";
import { Separator } from "../components/ui/separator";
import { useCommunityFromStore } from "../stores/communities";
import { Page } from "../components/page";
import { NoPostsMessage } from "../components/posts/no-posts-message";

const Post = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} />
    <></>
  </ContentGutters>
));

export default function CommunityPosts() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const router = useIonRouter();
  const [search, setSearch] = useState("");

  const { communityHandle: communityHandleEncoded } = useParams(
    `${linkCtx.root}c/:communityHandle`,
  );
  const communityHandle = useMemo(
    () => decodeURIComponent(communityHandleEncoded),
    [communityHandleEncoded],
  );

  const paginationMode = useSettingsStore((s) => s.paginationMode);
  const { postSort, suggestedPostSort } = useAvailableSortsQuery();
  const posts = usePostsQuery({
    communityHandle: communityHandle,
  });

  const mostRecentPost = useMostRecentPostQuery(
    "community",
    {
      communityHandle: communityHandle,
    },
    posts,
  );

  const communityQuery = useCommunityQuery({
    name: communityHandle,
  });
  const community = useCommunityFromStore(communityHandle);
  const isBlocked = useIsCommunityBlocked(communityHandle);
  const isInstanceBlocked = useIsInstanceBlocked(
    community?.communityView.instanceId,
  );
  const setPostSort = useFiltersStore((s) => s.setPostSort);

  useUpdateRecentCommunity(community?.communityView);

  const modApIds = community?.mods?.map((m) => m.apId);

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
    await refetch();
    setRefreshing(false);
  };

  return (
    <Page
      notFound={communityQuery.isError && !community}
      notFoundCommunityHandle={communityHandle}
    >
      <PageTitle>{communityHandle}</PageTitle>
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
              {communityHandle}
            </ToolbarTitle>
          </ToolbarButtons>
          <SearchBar
            placeholder={`Search ${communityHandle}`}
            value={search}
            onValueChange={setSearch}
            communityHandle={communityHandle}
            onSubmit={(newVal) => {
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
            <Link
              to={`${linkCtx.root}c/:communityHandle/s`}
              params={{
                communityHandle,
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
                <SmallScreenSidebar
                  communityHandle={communityHandle}
                  actorId={community?.communityView.apId}
                />
                <ContentGutters className="max-md:hidden pt-4">
                  <CommunityBanner communityHandle={communityHandle} />
                  <></>
                </ContentGutters>
              </Fragment>,
              <Fragment key="community-sort-bar">
                <CommunityPostSortBar communityHandle={communityHandle} />
                {!refreshing && (
                  <Separator className="[[data-is-sticky-header=false]_&]:opacity-1 data-[orientation=horizontal]:h-[0.5px] md:hidden" />
                )}
              </Fragment>,
            ]}
            noItems={
              isBlocked ||
              isInstanceBlocked ||
              (data.length === 0 && !posts.isFetching)
            }
            noItemsComponent={
              <NoPostsMessage
                isBlocked={isBlocked || isInstanceBlocked}
                blockedName={
                  isInstanceBlocked
                    ? communityHandle.split("@")[1]
                    : communityHandle
                }
                postSort={postSort}
                suggestedPostSort={suggestedPostSort}
                setPostSort={setPostSort}
                showSortHint={(community?.communityView?.postCount ?? 0) > 0}
              />
            }
            paginationControls={paginationControls}
            renderItem={({ item }) => (
              <Post
                apId={item}
                featuredContext="community"
                modApIds={modApIds}
              />
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
          {communityHandle && (
            <CommunitySidebar
              communityHandle={communityHandle}
              actorId={community?.communityView.apId}
            />
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
