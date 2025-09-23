import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "../../routing";
import { useLinkContext } from "@/src/routing/link-context";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ToolbarBackButton } from "../../components/toolbar/toolbar-back-button";
import { UserDropdown } from "../../components/nav";
import {
  useHideTabBarOnMount,
  useIsActiveRoute,
  useMedia,
  useNavbarHeight,
  useSafeAreaInsets,
  useUrlSearchState,
} from "../../lib/hooks";
import z from "zod";
import { ToolbarTitle } from "../../components/toolbar/toolbar-title";
import { cn } from "../../lib/utils";
import { Button } from "@/src/components/ui/button";
import { FaPlus, FaMinus } from "react-icons/fa";
import { MdZoomInMap } from "react-icons/md";
import { Spinner, NoImage } from "@/src/components/icons";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { ContentGutters } from "@/src/components/gutters";
import { ImageShareButton } from "@/src/components/posts/post-buttons";
import { canShareImage } from "@/src/lib/share";

const Controls = ({
  style,
  isZoomedIn,
  disabled,
}: {
  style?: CSSProperties;
  isZoomedIn: boolean;
  disabled?: boolean;
}) => {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div
      className="absolute right-0 dark flex flex-col mr-9 gap-2.5 max-md:hidden"
      style={style}
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={() => zoomIn()}
        tabIndex={disabled ? -1 : undefined}
      >
        <FaPlus />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => zoomOut()}
        tabIndex={disabled ? -1 : undefined}
      >
        <FaMinus />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="transition-opacity disabled:opacity-0"
        onClick={() => resetTransform()}
        disabled={!isZoomedIn || disabled}
        tabIndex={!isZoomedIn || disabled ? -1 : undefined}
      >
        <MdZoomInMap />
      </Button>
    </div>
  );
};

const ZOOM_FACTOR = 8;

export function ResponsiveImage({
  img,
  onZoom,
  paddingT = 0,
  paddingB = 0,
  className,
  disabled,
  blurNsfw,
  altText,
}: {
  paddingT?: number;
  paddingB?: number;
  img: string;
  onZoom: (scale: number) => void;
  className?: string;
  disabled?: boolean;
  blurNsfw?: boolean | null;
  altText?: string | null;
}) {
  const [removeBlur, setRemoveBlur] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(0);
  const [imageNaturalHeight, setImageNaturalHeight] = useState<number>(0);

  const imageScale = useMemo(() => {
    if (
      containerWidth === 0 ||
      containerHeight === 0 ||
      imageNaturalWidth === 0 ||
      imageNaturalHeight === 0
    )
      return 0;
    const scale = Math.min(
      containerWidth / imageNaturalWidth,
      containerHeight / imageNaturalHeight,
    );
    return scale;
  }, [containerWidth, containerHeight, imageNaturalWidth, imageNaturalHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleResize = () => {
        if (container !== null) {
          const rect = container.getBoundingClientRect();
          setContainerWidth(rect.width);
          setContainerHeight(rect.height - paddingT - paddingB);
        } else {
          setContainerWidth(0);
          setContainerHeight(0);
        }
      };

      handleResize();
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });

      resizeObserver.observe(container);
    }
  }, [paddingT, paddingB]);

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className={cn("h-full w-full bg-black", className)} ref={containerRef}>
      <TransformWrapper
        key={`${containerWidth}x${containerHeight}-${imageScale}`}
        initialScale={imageScale}
        minScale={imageScale}
        maxScale={imageScale * ZOOM_FACTOR}
        centerOnInit
        onTransformed={(z) => {
          const scale = z.state.scale / imageScale;
          setIsZoomedIn(scale > 1.05);
          onZoom(scale);
        }}
        panning={{ disabled: !isZoomedIn }}
        wheel={{ smoothStep: 0.15 }}
        doubleClick={{
          mode: isZoomedIn ? "reset" : "zoomIn",
          step: 0.75,
        }}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
          }}
        >
          <img
            className={cn(
              error && "opacity-0",
              blurNsfw && !removeBlur && "blur-3xl",
            )}
            src={img}
            onLoad={(e) => {
              setLoading(false);
              setImageNaturalWidth(e.currentTarget.naturalWidth);
              setImageNaturalHeight(e.currentTarget.naturalHeight);
            }}
            onError={() => setError(true)}
            style={{
              minWidth: imageNaturalWidth,
              width: imageNaturalWidth,
              maxWidth: imageNaturalWidth,
              minHeight: imageNaturalHeight,
              height: imageNaturalHeight,
              maxHeight: imageNaturalHeight,
            }}
            alt={altText ?? undefined}
          />
        </TransformComponent>
        {blurNsfw && !removeBlur && (
          <button
            className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-3xl"
            onClick={() => setRemoveBlur(true)}
            aria-label="Show NSFW"
          >
            NSFW
          </button>
        )}
        <Controls
          isZoomedIn={isZoomedIn}
          style={{ bottom: paddingB }}
          disabled={disabled}
        />
      </TransformWrapper>

      {loading && !error && (
        <Spinner className="absolute top-1/2 left-1/2 text-4xl -translate-1/2 text-white animate-spin" />
      )}
      {error && (
        <NoImage className="absolute top-1/2 left-1/2 h-40 w-40 -translate-1/2 text-white" />
      )}
    </div>
  );
}

export default function LightBox() {
  useHideTabBarOnMount();

  const linkCtx = useLinkContext();
  const { imgUrl } = useParams(`${linkCtx.root}lightbox/:imgUrl`);
  const src = decodeURIComponent(imgUrl);
  const [title] = useUrlSearchState("title", "", z.string());
  const [hideNav, setHideNav] = useState(false);
  const navbar = useNavbarHeight();
  const isActive = useIsActiveRoute();

  const media = useMedia();
  const insets = useSafeAreaInsets();
  const tabbar = {
    height: navbar.height,
    inset: insets.bottom,
  };

  const bottomBarHeight = media.md
    ? Math.max(navbar.height, tabbar.height + tabbar.inset)
    : tabbar.height + tabbar.inset;

  return (
    <IonPage className="dark">
      <PageTitle>Image</PageTitle>
      <IonHeader translucent={true}>
        <IonToolbar
          style={{
            "--ion-toolbar-background": "transparent",
            "--ion-toolbar-border-color": "var(--shad-border)",
          }}
          className={cn(
            isActive && "absolute backdrop-blur-2xl",
            hideNav && "opacity-0",
          )}
        >
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            {title && (
              <ToolbarTitle size="sm" numRightIcons={1}>
                {title}
              </ToolbarTitle>
            )}
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent
        fullscreen={true}
        style={{
          "--ion-background-color": "black",
        }}
        scrollY={false}
      >
        <ResponsiveImage
          img={src}
          onZoom={(scale) => {
            setHideNav(scale > 1.05);
          }}
          paddingT={navbar.height + navbar.inset}
          paddingB={tabbar.height + tabbar.inset}
        />
        {canShareImage() && (
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
              <ImageShareButton imageSrc={src} />
            </ContentGutters>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
