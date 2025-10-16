import { ContentGutters } from "@/src/components/gutters";
import {
  CSSProperties,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCommunity, usePost, usePosts } from "@/src/lib/api";
import _ from "lodash";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { BiHelpCircle } from "react-icons/bi";
import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useFiltersStore } from "@/src/stores/filters";
import {
  useHideTabBarOnMount,
  useIsActiveRoute,
  useKeyboardShortcut,
  useMedia,
  useNavbarHeight,
  useTabbarHeight,
  useUrlSearchState,
} from "@/src/lib/hooks";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { cn } from "@/src/lib/utils";
import {
  PostCommentsButton,
  PostShareButton,
  PostVoting,
  usePostVoting,
} from "@/src/components/posts/post-buttons";
import { usePostsStore } from "@/src/stores/posts";
import z from "zod";
import { decodeApId, encodeApId } from "@/src/lib/api/utils";
import { useLinkContext } from "@/src/routing/link-context";
import { useParams } from "@/src/routing";
import { Forms } from "@/src/lib/api/adapters/api-blueprint";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { Button } from "@/src/components/ui/button";
import { IonButtons, IonButton, IonModal, IonTitle } from "@ionic/react";
import { MarkdownRenderer } from "@/src/components/markdown/renderer";
import { Spinner, NoImage } from "@/src/components/icons";
import { getPostEmbed } from "@/src/lib/post";
import { useCommunityFromStore } from "@/src/stores/communities";
import { Swiper, SwiperSlide, useSwiper } from "swiper/react";
import { Virtual, Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { Swiper as SwiperType } from "swiper/types";
import { ProgressiveImage } from "@/src/components/progressive-image";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { MdZoomInMap } from "react-icons/md";

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 3;
const EMPTY_ARR: never[] = [];

function KeyboardShortcutHelpModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
          <IonTitle>Keyboard shortcuts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <MarkdownRenderer
          markdown={`
**Option 1: Arrow keys**

* Left arrow - previous post
* Right arrow - next post
* Up arrow - toggle upvote
* Down arrow - toggle downvote

**Option 2: For the gamers**

* A - previous post
* D - next post
* W - toggle upvote
* S - toggle downvote

**Option 3: Vim (god's editor)**

* j - previous post
* k - next post
* h - toggle upvote
* l - toggle downvote
`}
        />
      </IonContent>
    </IonModal>
  );
}

function useSwiperZoomScale(swiper?: SwiperType | null) {
  const [zoom, setZoom] = useState(0);
  useEffect(() => {
    const handler = (_e: SwiperType, scale: number) => {
      setZoom(scale);
    };
    swiper?.on("zoomChange", handler);
    return () => swiper?.off("zoomChange", handler);
  }, [swiper]);
  return zoom;
}

function useSwiperPinchZoom(swiper?: SwiperType | null) {
  useEffect(() => {
    if (!swiper) return;
    const el = swiper.el;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.02);
      const next = _.clamp(
        swiper.zoom.scale * factor,
        MIN_ZOOM_SCALE,
        MAX_ZOOM_SCALE,
      );
      swiper.zoom.in(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [swiper]);
}

function useScrollNextSlide(
  el: HTMLElement | null | undefined,
  onChange: (delta: -1 | 1) => void,
) {
  useEffect(() => {
    if (el) {
      const onWheel = _.throttle(
        (e: WheelEvent) => {
          e.preventDefault();
          const delta = _.clamp(_.round(e.deltaX / 70), -1, 1);
          if (delta === -1 || delta === 1) {
            onChange(delta);
          }
        },
        400,
        { leading: true, trailing: false },
      );
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }
  }, [el, onChange]);
}

const Controls = ({
  style,
  disabled,
}: {
  style?: CSSProperties;
  isZoomedIn?: boolean;
  disabled?: boolean;
}) => {
  const swiper = useSwiper();
  const zoom = useSwiperZoomScale(swiper);
  const isZoomedIn = zoom > 1.1;

  return (
    <div
      className="absolute right-0 z-10 dark flex flex-col mr-9 gap-2.5 max-md:hidden"
      style={style}
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={() =>
          swiper.zoom.in(_.clamp(zoom + 1, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE))
        }
        tabIndex={disabled ? -1 : undefined}
      >
        <FaPlus />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={() =>
          swiper.zoom.in(_.clamp(zoom - 1, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE))
        }
        tabIndex={disabled ? -1 : undefined}
      >
        <FaMinus />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="transition-opacity disabled:opacity-0"
        onClick={() => swiper.zoom.out()}
        disabled={!isZoomedIn || disabled}
        tabIndex={!isZoomedIn || disabled ? -1 : undefined}
      >
        <MdZoomInMap />
      </Button>
    </div>
  );
};

const Post = memo(
  ({
    apId,
    paddingT,
    paddingB,
  }: {
    apId: string;
    paddingT: number;
    paddingB: number;
  }) => {
    const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
    const postView = usePostsStore(
      (s) => s.posts[getCachePrefixer()(apId)]?.data,
    );

    const blurNsfw =
      useAuth((s) => getAccountSite(s.getSelectedAccount())?.blurNsfw) ?? true;
    const blurImg = blurNsfw ? postView?.nsfw : false;

    const embed = postView ? getPostEmbed(postView) : null;
    const img = embed?.thumbnail;

    return img ? (
      <div className="h-full w-full relative">
        <div className="swiper-zoom-container">
          <ProgressiveImage
            lowSrc={img}
            highSrc={embed?.fullResThumbnail}
            style={{ top: paddingT, bottom: paddingB }}
            className={cn(
              "absolute inset-x-0 bg-transparent overflow-visible",
              blurImg && "blur-3xl",
            )}
            imgClassName="object-contain"
          />
        </div>
      </div>
    ) : (
      <NoImage className="absolute top-1/2 left-1/2 h-40 w-40 -translate-1/2 text-white" />
    );
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
      return [...(initPostApId ? [initPostApId] : []), ...posts];
    }

    return posts;
  }, [missingPost, initPostApId, initPostQuery.isPending, posts]);

  return {
    data,
    initPostQuery,
    postsQuery,
  };
}

export default function LightBoxPostFeed() {
  useHideTabBarOnMount();

  const linkCtx = useLinkContext();
  const { communityName: communityNameEncoded } = useParams(
    `${linkCtx.root}c/:communityName/lightbox`,
  );
  const communityName = useMemo(
    () =>
      communityNameEncoded
        ? decodeURIComponent(communityNameEncoded)
        : undefined,
    [communityNameEncoded],
  );

  const [encodedApId, setEncodedApId] = useUrlSearchState(
    "apId",
    "",
    z.string(),
  );
  const decodedApId = encodedApId ? decodeApId(encodedApId) : null;
  const initPostApId = useRef(decodedApId).current ?? undefined;

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

  useCommunity({
    name: communityName,
  });
  const community = useCommunityFromStore(communityName);

  const updateRecent = useRecentCommunitiesStore((s) => s.update);

  useEffect(() => {
    if (community?.communityView) {
      updateRecent(community.communityView);
    }
  }, [community?.communityView, updateRecent]);

  const voting = usePostVoting(postApId);
  const { vote, isUpvoted, isDownvoted } = voting ?? {};

  useKeyboardShortcut(
    useCallback(
      (e) => {
        if (post && !e.metaKey) {
          switch (e.key) {
            case "ArrowUp":
            case "w":
            case "h":
              e.preventDefault();
              e.stopPropagation();
              vote?.({
                score: isUpvoted ? 0 : 1,
                postApId: post.apId,
                postId: post.id,
              });
              break;
            case "ArrowDown":
            case "s":
            case "l":
              e.preventDefault();
              e.stopPropagation();
              vote?.({
                score: isDownvoted ? 0 : -1,
                postApId: post.apId,
                postId: post.id,
              });
              break;
            default:
              break;
          }
        }
      },
      [vote, isUpvoted, isDownvoted, post],
    ),
  );

  const swiperRef = useRef<SwiperType>(null);
  useScrollNextSlide(
    swiperRef.current?.el,
    useCallback((delta) => {
      if (delta > 0) {
        swiperRef.current?.slideNext();
      } else {
        swiperRef.current?.slidePrev();
      }
    }, []),
  );

  const onIndexChange = useCallback(
    (newIndex: number) => {
      const newApId = data[newIndex];
      if (newApId && !isPending) {
        setEncodedApId(encodeApId(newApId));
      }
    },
    [data, isPending, setEncodedApId],
  );

  const [keyboardHelpModal, setKeyboardHelpModal] = useState(false);
  const zoom = useSwiperZoomScale(swiperRef.current);
  useSwiperPinchZoom(swiperRef.current);
  const hideNav = zoom > 1;

  useKeyboardShortcut(
    useCallback(
      (e) => {
        if (!isActive || e.metaKey) return;
        switch (e.key) {
          case "ArrowLeft":
          case "a":
          case "j":
            e.preventDefault();
            e.stopPropagation();
            swiperRef.current?.slidePrev(0);
            break;
          case "d":
          case "k":
          case "ArrowRight":
            e.preventDefault();
            e.stopPropagation();
            swiperRef.current?.slideNext(0);
            break;
          default:
            break;
        }
      },
      [isActive],
    ),
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
            <ToolbarTitle size="sm" numRightIcons={1}>
              {post?.title ?? "Loading..."}
            </ToolbarTitle>
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
        <KeyboardShortcutHelpModal
          isOpen={keyboardHelpModal}
          onClose={() => setKeyboardHelpModal(false)}
        />

        <Swiper
          key={isPending ? "pending" : "loaded"}
          allowTouchMove={!hideNav && !media.md}
          allowSlideNext={!hideNav}
          allowSlidePrev={!hideNav}
          onSwiper={(s) => (swiperRef.current = s)}
          initialSlide={activeIndex}
          onSlideChange={(s) => onIndexChange(s.activeIndex)}
          modules={[Virtual, Zoom]}
          zoom={{
            maxRatio: MAX_ZOOM_SCALE,
            minRatio: MIN_ZOOM_SCALE,
          }}
          virtual
          slidesPerView={1}
          className="h-full"
          onReachEnd={() => {
            if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
              postsQuery.fetchNextPage();
            }
          }}
        >
          <Controls style={{ bottom: bottomBarHeight }} />
          {data.map((item, i) => (
            <SwiperSlide key={i} virtualIndex={i} className="relative !h-auto">
              <Post
                apId={item}
                paddingT={navbar.height + navbar.inset}
                paddingB={bottomBarHeight}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {data.length === 0 && isPending && (
          <Spinner className="absolute top-1/2 left-1/2 text-4xl -translate-1/2 text-white animate-spin" />
        )}

        <div
          className={cn(
            "border-t-[.5px] z-10 absolute bottom-0 inset-x-0 dark",
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
              {postApId && <PostShareButton postApId={postApId} />}
              <div className="flex-1" />
              <Button
                variant="ghost"
                className={cn(
                  "text-muted-foreground max-md:hidden",
                  (initPostApId
                    ? postApId !== initPostApId
                    : activeIndex > 0) &&
                    "opacity-0 hover:opacity-100 focus:opacity-100",
                )}
                onClick={() => setKeyboardHelpModal(true)}
              >
                Keyboard shortcuts
                <BiHelpCircle />
              </Button>
              <div className="flex-1" />
              {postApId && <PostCommentsButton postApId={postApId} />}
              {postApId && <PostVoting key={postApId} apId={postApId} />}
            </div>
          </ContentGutters>
        </div>
      </IonContent>
    </IonPage>
  );
}
