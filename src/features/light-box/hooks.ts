import { useEffect, useState } from "react";
import _ from "lodash";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { Swiper as SwiperType } from "swiper/types";

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
