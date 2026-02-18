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
import { VirtualList } from "../components/virtual-list";
import {
  useAvailableSorts,
  useCommunity,
  useMostRecentPost,
  usePosts,
} from "../lib/api";
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
import { CommunityBanner } from "../components/communities/community-banner";
import { useUpdateRecentCommunity } from "../stores/recent-communities";
import { UserDropdown } from "../components/nav";
import { PostSortButton } from "../components/lemmy-sort";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "../routing/link-context";
import { Link } from "@/src/routing/index";
import { Button } from "../components/ui/button";
import { dispatchScrollEvent } from "../lib/scroll-events";
import { LuLoaderCircle } from "react-icons/lu";
import { FaArrowUp } from "react-icons/fa6";
import { useMedia } from "../lib/hooks";
import { CommunityPostSortBar } from "../components/communities/community-post-sort-bar";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useAuth, useIsCommunityBlocked } from "../stores/auth";
import { useFiltersStore } from "../stores/filters";
import { usePostsStore } from "../stores/posts";
import { Search } from "../components/icons";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";
import { Separator } from "../components/ui/separator";
import { useCommunityFromStore } from "../stores/communities";
import { NotFound } from "./not-found";

const EMPTY_ARR: never[] = [];

const NO_ITEMS = "NO_ITEMS";
type Item = string;

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

  const { communityName: communityNameEncoded } = useParams(
    `${linkCtx.root}c/:communityName`,
  );
  const communityName = useMemo(
    () => decodeURIComponent(communityNameEncoded),
    [communityNameEncoded],
  );

  const { postSort, postSorts } = useAvailableSorts();
  const posts = usePosts({
    communitySlug: communityName,
  });
  const data = useMemo(
    () => _.uniq(posts.data?.pages.flatMap((p) => p.posts)) ?? EMPTY_ARR,
    [posts.data],
  );

  const mostRecentPost = useMostRecentPost("community", {
    communitySlug: communityName,
  });

  const communityQuery = useCommunity({
    name: communityName,
  });
  const community = useCommunityFromStore(communityName);
  const isBlocked = useIsCommunityBlocked(communityName);
  const setPostSort = useFiltersStore((s) => s.setPostSort);

  const suggestedSort = postSorts?.includes("Active")
    ? "Active"
    : postSorts?.includes("Hot")
      ? "Hot"
      : undefined;

  useUpdateRecentCommunity(community?.communityView);

  const modApIds = community?.mods?.map((m) => m.apId);

  const {
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = posts;

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

  if (communityQuery.isError && !community) {
    return <NotFound communitySlug={communityName} />;
  }

  return (
    <IonPage>
      <PageTitle>{communityName}</PageTitle>
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
              {communityName}
            </ToolbarTitle>
          </ToolbarButtons>
          <SearchBar
            placeholder={`Search ${communityName}`}
            value={search}
            onValueChange={setSearch}
            communitySlug={communityName}
            onSubmit={(newVal) => {
              router.push(
                resolveRoute(
                  `${linkCtx.root}c/:communityName/s`,
                  {
                    communityName,
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
                communityName,
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
          <VirtualList<Item>
            key={postSort}
            fullscreen
            scrollHost
            data={
              isBlocked || (data.length === 0 && !posts.isFetching)
                ? [NO_ITEMS]
                : data
            }
            stickyIndicies={[1]}
            header={[
              <Fragment key="community-header">
                <SmallScreenSidebar
                  communityName={communityName}
                  actorId={community?.communityView.apId}
                />
                <ContentGutters className="max-md:hidden pt-4">
                  <CommunityBanner communityName={communityName} />
                  <></>
                </ContentGutters>
              </Fragment>,
              <Fragment key="community-sort-bar">
                <CommunityPostSortBar communityName={communityName} />
                {!refreshing && (
                  <Separator className="[[data-is-sticky-header=false]_&]:opacity-1 data-[orientation=horizontal]:h-[0.5px] md:hidden" />
                )}
              </Fragment>,
            ]}
            renderItem={({ item }) => {
              if (item === NO_ITEMS) {
                const communityHasPosts =
                  (community?.communityView?.postCount ?? 0) > 0;
                const showSortHint =
                  !isBlocked &&
                  communityHasPosts &&
                  suggestedSort !== undefined &&
                  postSort !== suggestedSort;

                return (
                  <ContentGutters>
                    <div className="flex-1 italic text-muted-foreground p-6 text-center">
                      {isBlocked ? (
                        <span>You have {communityName} blocked</span>
                      ) : showSortHint ? (
                        <span>
                          No posts for &ldquo;{postSort}&rdquo; sort. Try
                          switching to{" "}
                          <button
                            className="not-italic underline"
                            onClick={() => setPostSort(suggestedSort)}
                          >
                            &ldquo;{suggestedSort}&rdquo;
                          </button>
                          .
                        </span>
                      ) : (
                        <span>Nothing to see here</span>
                      )}
                    </div>
                    <></>
                  </ContentGutters>
                );
              }
              return (
                <Post
                  apId={item}
                  featuredContext="community"
                  modApIds={modApIds}
                />
              );
            }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
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
          {communityName && (
            <CommunitySidebar
              communityName={communityName}
              actorId={community?.communityView.apId}
            />
          )}
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
