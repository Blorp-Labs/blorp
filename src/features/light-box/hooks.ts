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
      const absY = Math.abs(e.deltaY);
      const scale = swiper.zoom.scale;
      if ((absY > 10 || scale > 1) && absY > Math.abs(e.deltaX)) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.02);
        const next = _.clamp(
          swiper.zoom.scale * factor,
          MIN_ZOOM_SCALE,
          MAX_ZOOM_SCALE,
        );
        swiper.zoom.in(next);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [swiper]);
}

export function useSwiperZoomScale(swiper?: SwiperType | null) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (swiper) {
      const handler = (_e: SwiperType, scale: number) => {
        setZoom(scale);
      };
      setZoom(swiper.zoom?.scale ?? 1);
      swiper.on("zoomChange", handler);
      return () => swiper?.off("zoomChange", handler);
    }
  }, [swiper]);
  return zoom;
}

export function useScrollNextSlide(
  el: HTMLElement | null | undefined,
  onChange: (delta: -1 | 1) => void,
) {
  useEffect(() => {
    if (el) {
      const throttledChange = _.throttle(
        (delta: -1 | 1) => {
          onChange(delta);
        },
        500,
        { leading: true, trailing: false },
      );
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const absX = Math.abs(e.deltaX);
        if (absX > 0 && absX > Math.abs(e.deltaY)) {
          const delta = _.clamp(_.round(e.deltaX / 10), -1, 1);
          if (delta === -1 || delta === 1) {
            throttledChange(delta);
          }
        }
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }
  }, [el, onChange]);
}
