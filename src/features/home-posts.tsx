import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import { ContentGutters } from "../components/gutters";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFiltersStore } from "../stores/filters";
import { useAvailableSorts, useMostRecentPost, usePosts } from "../lib/api";
import _ from "lodash";
import { LocalSererSidebar } from "../components/local-server/local-server-sidebar";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { VirtualList } from "../components/virtual-list";
import { MenuButton, UserDropdown } from "../components/nav";
import { HomeFilter, PostSortButton } from "../components/lemmy-sort";
import { useIsActiveRoute, useMedia } from "../lib/hooks";
import { Link, resolveRoute } from "@/src/routing/index";
import { Button } from "../components/ui/button";
import { FaArrowUp } from "react-icons/fa6";
import { LuLoaderCircle } from "react-icons/lu";
import { dispatchScrollEvent } from "../lib/scroll-events";
import { PostReportProvider } from "../components/posts/post-report";
import { PageTitle } from "../components/page-title";
import { PostsSortBar } from "../components/posts/posts-sort-bar";
import { getAccountSite, useAuth } from "../stores/auth";
import { usePostsStore } from "../stores/posts";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";
import { useReducedMotion } from "../lib/hooks/use-reduced-motion";
import { usePagination } from "../lib/hooks/use-pagination";
import { useSettingsStore } from "../stores/settings";
import { NoPostsMessage } from "../components/posts/no-posts-message";

const Post = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} featuredContext="home" />
    <></>
  </ContentGutters>
));

function useHideHeaderTabBar(div: HTMLDivElement | null, active: boolean) {
  const prevOffsetRef = useRef<number | null>(null);
  const headerAnimateRef = useRef(0);
  const tabBarAnimateRef = useRef(0);

  const { tabBar, header, toolbar, newPostButton } = useMemo(() => {
    const tabBar = document.querySelector("ion-tab-bar");

    const header = document.querySelector<HTMLIonHeaderElement>(
      "ion-header.dismissable",
    );
    const toolbar = document.querySelector<HTMLIonToolbarElement>(
      "ion-toolbar.dismissable",
    );

    const newPostButton =
      document.querySelector<HTMLButtonElement>(".new-post-button");

    return {
      tabBar,
      header,
      toolbar,
      newPostButton,
    };
  }, [active]);

  const scrollHandler = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (prevOffsetRef.current === null || !active) {
        return;
      }

      const safeAreaTop = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--ion-safe-area-top")
          .trim(),
        10,
      );

      if (header && toolbar && tabBar && newPostButton) {
        const headerHeight = _.isNumber(safeAreaTop)
          ? header.offsetHeight - safeAreaTop
          : header.offsetHeight;

        const scrollOffset = Math.max(e.currentTarget.scrollTop, 0);
        const delta = scrollOffset - prevOffsetRef.current;
        prevOffsetRef.current = scrollOffset;

        headerAnimateRef.current = _.clamp(
          headerAnimateRef.current + delta / headerHeight,
          0,
          1,
        );
        tabBarAnimateRef.current = _.clamp(
          headerAnimateRef.current + delta / tabBar.offsetHeight,
          0,
          1,
        );

        header.style.transform = `translate(0, -${
          headerAnimateRef.current * headerHeight
        }px)`;
        toolbar.style.opacity = String(1 - headerAnimateRef.current);
        tabBar.style.transform = `translate(0, ${
          tabBarAnimateRef.current * 100
        }%)`;

        newPostButton.style.opacity = String(1 - headerAnimateRef.current);
      }
    },
    [active, header, toolbar, tabBar, newPostButton],
  );

  const scrollTop = useRef(div?.scrollTop ?? 0);
  scrollTop.current = div?.scrollTop ?? 0;

  useEffect(() => {
    if (!active) {
      prevOffsetRef.current = 0;
      headerAnimateRef.current = 0;
      tabBarAnimateRef.current = 0;
      if (header && tabBar && toolbar && newPostButton) {
        header.style.transform = `translate(0)`;
        toolbar.style.opacity = "1";
        tabBar.style.transform = `translate(0)`;
        newPostButton.style.opacity = "1";
      }
    } else {
      prevOffsetRef.current = scrollTop.current;
    }
  }, [active, tabBar, header, toolbar, newPostButton]);

  return { scrollHandler };
}

function useScrollY() {
  const active = useIsActiveRoute("/home");
  const [scrollY, setScrollY] = useState(false);

  useEffect(() => {
    if (!active) {
      const handler = _.debounce(() => {
        setScrollY(true);
      }, 100);
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    } else {
      setScrollY(false);
    }
  }, [active]);

  return scrollY;
}

function WrappedIonContent({ children }: { children: React.ReactNode }) {
  const scrollY = useScrollY();
  const media = useMedia();
  return (
    <IonContent
      // THIS IS A HACK
      // This fixes a bug where IonContent is the wrong size
      // after rotating your phone from another screen.
      scrollY={scrollY}
      fullscreen={media.maxMd}
    >
      {children}
    </IonContent>
  );
}

export default function HomePosts() {
  const router = useIonRouter();
  const [search, setSearch] = useState("");

  const media = useMedia();
  const { postSort, suggestedPostSort } = useAvailableSorts();
  const listingType = useFiltersStore((s) => s.listingType);
  const setPostSort = useFiltersStore((s) => s.setPostSort);

  const paginationMode = useSettingsStore((s) => s.paginationMode);

  const posts = usePosts({
    sort: postSort,
    type: listingType,
  });

  const mostRecentPost = useMostRecentPost("local", {
    sort: postSort,
    type: listingType,
  });

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
    listKey: postSort + listingType,
  });

  const data = useMemo(() => _.uniq(flatData), [flatData]);

  const mostRecentPostApId = mostRecentPost?.data;
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const siteHasPosts = useAuth(
    (s) => (getAccountSite(s.getSelectedAccount())?.postCount ?? 0) > 0,
  );

  const hasNewPost = usePostsStore((s) =>
    mostRecentPostApId
      ? !(getCachePrefixer()(mostRecentPostApId) in s.posts)
      : false,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const scrollAnimation = useHideHeaderTabBar(
    scrollRef.current,
    focused && media.maxMd && !reducedMotion,
  );

  const refreshFeed = () => Promise.all([refetch(), mostRecentPost.refetch()]);

  return (
    <IonPage className="home-page">
      <PageTitle />
      <IonHeader className="backdrop-blur-xs bg-gradient-to-b from-20% from-background to-background/30 dismissable">
        <IonToolbar data-tauri-drag-region className="dismissable">
          <ToolbarButtons side="left">
            <MenuButton />
            <HomeFilter />
          </ToolbarButtons>
          <SearchBar
            onValueChange={setSearch}
            value={search}
            onSubmit={(newVal) => {
              router.push(resolveRoute("/home/s", `?q=${newVal ?? search}`));
            }}
            className="max-md:hidden"
          />
          <ToolbarButtons side="right">
            <Link
              to="/home/s"
              className="text-2xl text-muted-foreground md:hidden"
            >
              <Search className="scale-110" />
            </Link>
            <div className="md:hidden contents">
              <PostSortButton align="end" />
            </div>
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>

        <ContentGutters className="absolute mt-2 inset-x-0 new-post-button">
          <div className="flex flex-row justify-center flex-1">
            {hasNewPost && (
              <Button
                variant="outline"
                size="sm"
                className="absolute"
                onClick={() => {
                  refreshFeed();
                  // This is a hack to send you to the top of the feed
                  dispatchScrollEvent("/home/");
                }}
              >
                New posts
                {isRefetching ? (
                  <LuLoaderCircle className="animate-spin" />
                ) : (
                  <FaArrowUp />
                )}
              </Button>
            )}
          </div>
          <></>
        </ContentGutters>
      </IonHeader>
      <WrappedIonContent>
        <PostReportProvider>
          <VirtualList
            listKey={postSort + listingType}
            onFocusChange={setFocused}
            ref={scrollRef}
            estimatedItemSize={450}
            data={data}
            placeholder={
              <ContentGutters className="px-0">
                <PostCardSkeleton />
                <></>
              </ContentGutters>
            }
            header={[<PostsSortBar key="header" />]}
            noItems={data.length === 0 && !posts.isFetching}
            noItemsComponent={
              <NoPostsMessage
                postSort={postSort}
                suggestedPostSort={suggestedPostSort}
                setPostSort={setPostSort}
                showSortHint={siteHasPosts}
              />
            }
            paginationControls={paginationControls}
            renderItem={({ item }) => <Post key={item} apId={item} />}
            scrollHost
            fullscreen
            onEndReached={onEndReached}
            onScroll={scrollAnimation.scrollHandler}
            refresh={refreshFeed}
          />
        </PostReportProvider>
        <ContentGutters className="max-md:hidden absolute top-0 right-0 left-0">
          <div className="flex-1" />
          <LocalSererSidebar />
        </ContentGutters>
      </WrappedIonContent>
    </IonPage>
  );
}
