import { ContentGutters } from "@/src/components/gutters";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommunity, usePost, usePosts } from "@/src/lib/api";
import _ from "lodash";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { Spinner } from "@/src/components/icons";

import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useFiltersStore } from "@/src/stores/filters";
import {
  useElementHadFocus,
  useHideTabBarOnMount,
  useIsActiveRoute,
  useMedia,
  useNavbarHeight,
  useTabbarHeight,
  useUrlSearchState,
} from "@/src/lib/hooks";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { useAuth } from "@/src/stores/auth";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { cn } from "@/src/lib/utils";
import { ResponsiveImage } from "./light-box";
import {
  PostCommentsButton,
  PostShareButton,
  PostVoting,
  usePostVoting,
} from "@/src/components/posts/post-buttons";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePostsStore } from "@/src/stores/posts";
import z from "zod";
import { decodeApId, encodeApId } from "@/src/lib/api/utils";
import { useLinkContext } from "@/src/routing/link-context";
import { useParams } from "@/src/routing";
import { Forms } from "@/src/lib/api/adapters/api-blueprint";
import { useRequireAuth } from "@/src/components/auth-context";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";

const EMPTY_ARR: never[] = [];

function HorizontalVirtualizer<T>({
  data,
  renderItem,
  activeIndex = 0,
  onIndexChange,
  onEndReached,
  className,
}: {
  data?: T[] | readonly T[];
  renderItem: (params: { item: T; index: number }) => React.ReactNode;
  activeIndex?: number;
  onIndexChange: (index: number) => void;
  onEndReached?: () => any;
  className?: string;
}) {
  const count = data?.length ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  const itemWidth = scrollRef.current?.clientWidth ?? window.innerWidth;

  const initialOffset = activeIndex * itemWidth;

  const focused = useElementHadFocus(scrollRef);

  const rowVirtualizer = useVirtualizer({
    count,
    overscan: 3,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemWidth,
    horizontal: true,
    initialMeasurementsCache: Array.from({
      length: count,
    })
      .fill(0)
      .map((_i, index) => ({
        key: index,
        index: index,
        start: index * itemWidth,
        end: index * itemWidth + itemWidth,
        size: itemWidth,
        lane: 0,
      })),
    initialOffset: initialOffset,
    enabled: focused,
    initialRect: {
      width: itemWidth,
      height: window.innerHeight,
    },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const { scrollBy } = rowVirtualizer;

  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();
    if (!lastItem || _.isNil(count)) {
      return;
    }
    if (lastItem.index >= count - 1) {
      onEndReached?.();
    }
  }, [count, virtualItems, onEndReached]);

  const isReady = rowVirtualizer.getVirtualIndexes().includes(activeIndex);

  const scrollOffset = useRef(rowVirtualizer.scrollOffset);
  scrollOffset.current = rowVirtualizer.scrollOffset;

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !isReady) return;
    const offset = scrollOffset.current ?? 0;
    const cache = rowVirtualizer.measurementsCache;

    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < cache.length; i++) {
      const item = cache[i];
      if (_.isNil(item)) {
        continue;
      }
      const start = item.start;
      const distance = Math.abs(offset - start);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      } else {
        // Since cache is sorted by `start`, once distance grows
        // beyond the minimum we've seen, it will only increase.
        break;
      }
    }

    if (bestIndex > -1 && bestIndex !== activeIndex) {
      onIndexChange(bestIndex);
    }
  }, [isReady, rowVirtualizer.measurementsCache, activeIndex, onIndexChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !focused) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        updateIndex();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [updateIndex, focused]);

  const [snap, setSnap] = useState(true);

  const timerRef = useRef<number>(-1);
  useEffect(() => {
    if (!focused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "j":
          window.clearTimeout(timerRef.current);
          e.preventDefault();
          e.stopPropagation();
          setSnap(false);
          scrollBy(-itemWidth, {
            behavior: "auto",
            align: "start",
          });
          updateIndex();
          timerRef.current = window.setTimeout(() => {
            setSnap(true);
          }, 50);
          break;
        case "d":
        case "k":
        case "ArrowRight":
          window.clearTimeout(timerRef.current);
          e.preventDefault();
          e.stopPropagation();
          setSnap(false);
          scrollBy(itemWidth, {
            behavior: "auto",
            align: "start",
          });
          updateIndex();
          timerRef.current = window.setTimeout(() => {
            setSnap(true);
          }, 50);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [itemWidth, scrollBy, updateIndex, focused]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "overflow-x-scroll overflow-y-hidden hide-scrollbars h-full w-full relative",
        snap && "snap-x snap-mandatory",
        className,
      )}
    >
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const item = data?.[virtualItem.index];
        return item ? (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={rowVirtualizer.measureElement}
            style={{
              width: itemWidth,
              minWidth: itemWidth,
              maxWidth: itemWidth,
              position: "absolute",
              inset: 0,
              transform: `translateX(${virtualItem.start}px)`,
            }}
            className="relative snap-start snap-always"
          >
            {renderItem?.({
              item,
              index: virtualItem.index,
            })}
          </div>
        ) : null;
      })}
    </div>
  );
}

const Post = memo(
  ({
    apId,
    paddingT,
    paddingB,
    onZoom,
    disabled,
  }: {
    apId: string;
    paddingT: number;
    paddingB: number;
    onZoom: (scale: number) => void;
    disabled?: boolean;
  }) => {
    const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
    const postView = usePostsStore(
      (s) => s.posts[getCachePrefixer()(apId)]?.data,
    );
    const img = postView?.thumbnailUrl;
    return img ? (
      <ResponsiveImage
        img={img}
        onZoom={onZoom}
        paddingT={paddingT}
        paddingB={paddingB}
        className="border-x border-background -mx-px"
        disabled={disabled}
      />
    ) : null;
  },
);

function useLightboxPostFeedData({
  communityName,
  listingType,
  activePostApId,
}: {
  communityName?: string;
  listingType: Forms.GetPosts["type"];
  activePostApId?: string | null;
}) {
  const postsQuery = usePosts(
    communityName
      ? {
          communitySlug: communityName,
        }
      : {
          type: listingType,
        },
  );

  const posts = useMemo(
    () =>
      _.uniq(postsQuery.data?.pages.flatMap((p) => p.imagePosts) ?? EMPTY_ARR),
    [postsQuery.data],
  );

  const initPostApId = useRef(activePostApId).current ?? undefined;
  const missingPost = useMemo(() => {
    return !!initPostApId && !posts.includes(initPostApId);
  }, [posts, initPostApId]);

  const initPostQuery = usePost({
    ap_id: initPostApId,
    enabled: missingPost,
  });

  const data = useMemo(() => {
    if (missingPost && initPostQuery.isPending) {
      return [];
    }

    if (missingPost) {
      return [
        ...(initPostQuery.data ? [initPostQuery.data.apId] : []),
        ...posts,
      ];
    }

    return posts;
  }, [missingPost, initPostQuery.data, initPostQuery.isPending, posts]);

  return {
    data,
    initPostQuery,
    postsQuery,
  };
}

export default function LightBoxPostFeed() {
  useHideTabBarOnMount();

  const linkCtx = useLinkContext();
  const { communityName } = useParams(
    `${linkCtx.root}c/:communityName/lightbox`,
  );

  const [encodedApId, setEncodedApId] = useUrlSearchState(
    "apId",
    "",
    z.string(),
  );
  const decodedApId = encodedApId ? decodeApId(encodedApId) : null;

  const [hideNav, setHideNav] = useState(false);
  const media = useMedia();
  const navbar = useNavbarHeight();
  const tabbar = useTabbarHeight();
  const isActive = useIsActiveRoute();

  const bottomBarHeight = media.md
    ? Math.max(navbar.height, tabbar.height + tabbar.inset)
    : tabbar.height + tabbar.inset;

  const listingType = useFiltersStore((s) => s.listingType);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const { data, initPostQuery, postsQuery } = useLightboxPostFeedData({
    communityName,
    listingType,
    activePostApId: decodedApId,
  });

  const isPending = initPostQuery.isPending || postsQuery.isPending;

  useEffect(() => {
    if (initPostQuery.isError) {
      setEncodedApId("");
    }
  }, [initPostQuery.isError, setEncodedApId]);

  const activeIndex = Math.max(
    data.findIndex((apId) => apId === decodedApId),
    0,
  );

  const postApId = data[activeIndex];
  const post = usePostsStore((s) =>
    postApId ? s.posts[getCachePrefixer()(postApId)]?.data : null,
  );

  const community = useCommunity({
    name: communityName,
  });

  const updateRecent = useRecentCommunitiesStore((s) => s.update);

  useEffect(() => {
    if (community.data) {
      updateRecent(community.data.community);
    }
  }, [community.data, updateRecent]);

  const requireAuth = useRequireAuth();

  const voting = usePostVoting(postApId);
  const { vote, isUpvoted, isDownvoted } = voting ?? {};

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (post) {
        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "h":
            e.preventDefault();
            e.stopPropagation();
            requireAuth().then(() => {
              vote?.mutate({
                score: isUpvoted ? 0 : 1,
                postApId: post.apId,
                postId: post.id,
              });
            });
            break;
          case "ArrowDown":
          case "s":
          case "l":
            e.preventDefault();
            e.stopPropagation();
            requireAuth().then(() => {
              vote?.mutate({
                score: isDownvoted ? 0 : -1,
                postApId: post.apId,
                postId: post.id,
              });
            });
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [vote, isUpvoted, isDownvoted, post, isActive, requireAuth]);

  const onIndexChange = useCallback(
    (newIndex: number) => {
      const newApId = data[newIndex];
      if (newApId && !isPending) {
        setEncodedApId(encodeApId(newApId));
      }
    },
    [data, isPending, setEncodedApId],
  );

  return (
    <IonPage className="dark">
      <PageTitle>Image</PageTitle>
      <IonHeader>
        <IonToolbar
          style={{
            "--ion-toolbar-background": hideNav
              ? "transparent"
              : "var(--shad-background)",
            "--ion-toolbar-border-color": "var(--shad-border)",
          }}
          className={cn("dark", hideNav && "opacity-0")}
        >
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm">{post?.title ?? "Loading..."}</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent
        fullscreen
        style={{
          "--ion-background-color": "black",
        }}
        scrollY={false}
        className="absolute inset-0"
      >
        <HorizontalVirtualizer
          key={isPending ? "pending" : "loaded"}
          onIndexChange={onIndexChange}
          activeIndex={activeIndex}
          data={data}
          renderItem={(item) => (
            <Post
              apId={item.item}
              paddingT={navbar.height + navbar.inset}
              paddingB={bottomBarHeight}
              onZoom={(scale) => setHideNav(scale > 1.05)}
              disabled={item.index !== activeIndex}
            />
          )}
          onEndReached={() => {
            if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
              postsQuery.fetchNextPage();
            }
          }}
        />

        {data.length === 0 && isPending && (
          <Spinner className="absolute top-1/2 left-1/2 text-4xl -translate-1/2 text-white animate-spin" />
        )}
      </IonContent>
      <div
        className={cn(
          "border-t-[.5px] z-10 absolute bottom-0 inset-x-0 bg-black/50",
          hideNav && "opacity-0",
          !isActive && "hidden",
        )}
        style={{
          // This is kinda weird, but I thought it looked
          // better if the bottom controls height mated the
          // toolbar height on desktop.
          height: bottomBarHeight,
          paddingBottom: tabbar.inset,
        }}
      >
        <ContentGutters className="h-full">
          <div className="flex flex-row items-center gap-3">
            {postApId && (
              <PostShareButton
                postApId={postApId}
                className="bg-transparent backdrop-blur-xs"
              />
            )}
            <div className="flex-1" />
            {postApId && (
              <PostCommentsButton
                postApId={postApId}
                className="bg-transparent backdrop-blur-xs"
              />
            )}
            {postApId && (
              <PostVoting
                key={postApId}
                apId={postApId}
                className="backdrop-blur-xs"
              />
            )}
          </div>
        </ContentGutters>
      </div>
    </IonPage>
  );
}
