import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "../../routing";
import { useLinkContext } from "@/src/routing/link-context";
import { useCallback, useRef, useState } from "react";
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
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { ContentGutters } from "@/src/components/gutters";
import { ImageShareButton } from "@/src/components/posts/post-buttons";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { PanzoomProvider, usePanZoom } from "./panzoom";

function Image({
  src,
  bottomBarHeight,
  onZoom,
}: {
  src: string;
  bottomBarHeight: number;
  onZoom: (scale: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const navbar = useNavbarHeight();
  const paddingTop = navbar.height + navbar.inset;
  const paddingBottom = bottomBarHeight;
  usePanZoom({
    container: ref.current,
    imageAspectRatio: aspectRatio,
    paddingTop,
    paddingBottom,
    onZoom,
  });
  return (
    <div
      ref={ref}
      className="h-full relative"
      style={{
        paddingTop,
        paddingBottom,
      }}
    >
      <div className="swiper-zoom-container">
        <img
          src={src}
          className="h-full w-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setAspectRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
        />
      </div>
    </div>
  );
}

export default function LightBox() {
  useHideTabBarOnMount();

  const linkCtx = useLinkContext();
  const { imgUrl } = useParams(`${linkCtx.root}lightbox/:imgUrl`);
  const src = decodeURIComponent(imgUrl);
  const [title] = useUrlSearchState("title", "", z.string());
  const navbar = useNavbarHeight();
  const isActive = useIsActiveRoute();

  const [hideNav, setHideNav] = useState(false);
  const onZoom = useCallback((scale: number) => {
    setHideNav(scale > 1);
  }, []);

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
        fullscreen
        style={{
          "--ion-background-color": "black",
        }}
        scrollY={false}
        className="absolute inset-0"
      >
        <PanzoomProvider>
          <Image src={src} bottomBarHeight={bottomBarHeight} onZoom={onZoom} />
        </PanzoomProvider>

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
            <div className="my-auto">
              <ImageShareButton imageSrc={src} />
            </div>
          </ContentGutters>
        </div>
      </IonContent>
    </IonPage>
  );
}
