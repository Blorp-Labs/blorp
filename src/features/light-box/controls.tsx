import { CSSProperties } from "react";
import _ from "lodash";
import { Button } from "@/src/components/ui/button";
import { useSwiper } from "swiper/react";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { useSwiperZoomScale } from "./hooks";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "./config";

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

  return (
    <div
      className="absolute right-0 top-0 bottom-0 mr-2 z-10 dark flex flex-col justify-center gap-2.5 max-md:hidden"
      style={style}
    >
      <Button
        variant="secondary"
        size="icon"
        className="bg-background/40 backdrop-blur-3xl"
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
        className="bg-background/40 backdrop-blur-3xl"
        onClick={() => swiper.zoom.out()}
        tabIndex={disabled ? -1 : undefined}
      >
        <FaMinus />
      </Button>
    </div>
  );
};
