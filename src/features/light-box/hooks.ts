import { useEffect, useState } from "react";
import _ from "lodash";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { Swiper as SwiperType } from "swiper/types";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "./config";

export function useSwiperPinchZoom(swiper?: SwiperType | null) {
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

export function useSwiperZoomScale(swiper?: SwiperType | null) {
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

export function useScrollNextSlide(
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
