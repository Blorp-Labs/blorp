import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "../../routing";
import { useLinkContext } from "@/src/routing/link-context";
import { useRef } from "react";
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
import { canShareImage } from "@/src/lib/share";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "./config";
import { Controls } from "./controls";
import { Swiper as SwiperType } from "swiper/types";
import { useSwiperPinchZoom, useSwiperZoomScale } from "./hooks";

export default function LightBox() {
  useHideTabBarOnMount();

  const linkCtx = useLinkContext();
  const { imgUrl } = useParams(`${linkCtx.root}lightbox/:imgUrl`);
  const src = decodeURIComponent(imgUrl);
  const [title] = useUrlSearchState("title", "", z.string());
  const navbar = useNavbarHeight();
  const isActive = useIsActiveRoute();

  const swiperRef = useRef<SwiperType>(null);
  const zoom = useSwiperZoomScale(swiperRef.current);
  useSwiperPinchZoom(swiperRef.current);
  const hideNav = zoom > 1;

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
        <Swiper
          onSwiper={(s) => (swiperRef.current = s)}
          modules={[Zoom]}
          zoom={{
            maxRatio: MAX_ZOOM_SCALE,
            minRatio: MIN_ZOOM_SCALE,
          }}
          slidesPerView={1}
          className="h-full"
        >
          <Controls style={{ bottom: bottomBarHeight }} />
          <SwiperSlide className="relative !h-auto">
            <div
              className="h-full relative"
              style={{
                paddingTop: navbar.height + navbar.inset,
                paddingBottom: canShareImage() ? bottomBarHeight : 0,
              }}
            >
              <div className="swiper-zoom-container">
                <img src={src} className="h-full w-full object-contain" />
              </div>
            </div>
          </SwiperSlide>
        </Swiper>

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
              <div className="my-auto">
                <ImageShareButton imageSrc={src} />
              </div>
            </ContentGutters>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
