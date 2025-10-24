import { CSSProperties, useRef } from "react";
import _ from "lodash";
import { Button } from "@/src/components/ui/button";
import { useSwiper } from "swiper/react";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { useSwiperZoomScale } from "./hooks";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "./config";

type AnimateValueOptions = {
  start: number;
  end: number;
  duration: number; // in milliseconds
  callback: (value: number) => void;
};

type AnimateValueReturn = {
  cancel: () => void;
};

function animateValue({
  start,
  end,
  duration,
  callback,
}: AnimateValueOptions): AnimateValueReturn {
  let startTime: number | null = null;
  let canceled = false;
  let rafId: number;

  const step = (timestamp: number) => {
    if (canceled) return;

    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // progress from 0 → 1
    const t = Math.min(elapsed / duration, 1);

    // linear interpolation
    const currentValue = start + (end - start) * t;

    callback(currentValue);

    if (t < 1) {
      rafId = requestAnimationFrame(step);
    }
  };

  rafId = requestAnimationFrame(step);

  return {
    cancel: () => {
      canceled = true;
      cancelAnimationFrame(rafId);
    },
  };
}

export const Controls = ({
  style,
  disabled,
}: {
  style?: CSSProperties;
  isZoomedIn?: boolean;
  disabled?: boolean;
}) => {
  const swiper = useSwiper();
  const zoom = useSwiperZoomScale(swiper);
  const cancelAnimation = useRef(_.noop);

  return (
    <div
      className="absolute right-0 top-0 bottom-0 mr-2 z-10 dark flex flex-col justify-center gap-2.5 max-md:hidden"
      style={style}
    >
      <Button
        variant="secondary"
        size="icon"
        className="bg-background/40 backdrop-blur-3xl"
        onClick={() => {
          cancelAnimation.current();
          const { cancel } = animateValue({
            start: zoom,
            end: _.clamp(zoom + 1, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE),
            duration: 175,
            callback: (val) => swiper.zoom.in(val),
          });
          cancelAnimation.current = cancel;
        }}
        tabIndex={disabled ? -1 : undefined}
      >
        <FaPlus />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="bg-background/40 backdrop-blur-3xl"
        onClick={() => {
          cancelAnimation.current();
          const { cancel } = animateValue({
            start: zoom,
            end: _.clamp(zoom - 1, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE),
            duration: 175,
            callback: (val) => swiper.zoom.in(val),
          });
          cancelAnimation.current = cancel;
        }}
        tabIndex={disabled ? -1 : undefined}
      >
        <FaMinus />
      </Button>
    </div>
  );
};
