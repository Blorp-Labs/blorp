import {
  createContext,
  CSSProperties,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import _ from "lodash";
import { Button } from "@/src/components/ui/button";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { FaMinus, FaPlus } from "react-icons/fa6";
import Panzoom, { PanzoomOptions } from "@panzoom/panzoom";

type Fn = (event: "zoom-in" | "zoom-out") => void;

const Context = createContext<{
  listen: (fn: Fn) => () => void;
}>({
  listen: () => _.noop,
});

export const PanzoomProvider = ({
  style,
  disabled,
  children,
}: {
  style?: CSSProperties;
  isZoomedIn?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => {
  // const swiper = useSwiper();
  // const zoom = useSwiperZoomScale(swiper);
  // const cancelAnimation = useRef(_.noop);

  const [listeners, setListeners] = useState<Fn[]>([]);

  const listen = useCallback((fn: Fn) => {
    setListeners((prev) => [...prev, fn]);
    return () => setListeners((prev) => prev.filter((item) => item !== fn));
  }, []);

  return (
    <Context.Provider value={{ listen }}>
      <div
        className="absolute right-0 top-0 bottom-0 mr-2 z-10 dark flex flex-col justify-center gap-2.5 max-md:hidden"
        style={style}
      >
        <Button
          variant="secondary"
          size="icon"
          className="bg-background/40 backdrop-blur-3xl"
          onClick={() => {
            for (const listener of listeners) {
              listener("zoom-in");
            }
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
            for (const listener of listeners) {
              listener("zoom-out");
            }
          }}
          tabIndex={disabled ? -1 : undefined}
        >
          <FaMinus />
        </Button>
      </div>
      {children}
    </Context.Provider>
  );
};

/**
 * Calculates the rendered size of an image using object-fit: contain.
 *
 * @param containerWidth  - Width of the container
 * @param containerHeight - Height of the container
 * @param imageAspect     - Aspect ratio of the image (width / height)
 * @returns { width, height } - Rendered image dimensions
 */
export function fitContain(
  containerWidth: number,
  containerHeight: number,
  imageAspect: number,
): { width: number; height: number } {
  const containerAspect = containerWidth / containerHeight;

  // Image is relatively wider → width limits
  if (imageAspect > containerAspect) {
    const width = containerWidth;
    const height = width / imageAspect;
    return { width, height };
  }

  // Image is relatively taller → height limits
  const height = containerHeight;
  const width = height * imageAspect;
  return { width, height };
}

export function usePanZoom(
  opts: {
    container?: HTMLDivElement | null;
    active?: boolean;
    onZoom?: (scale: number) => void;
    paddingTop?: number;
    paddingBottom?: number;
    imageAspectRatio: number;
  },
  deps?: (string | null | undefined)[],
) {
  const {
    container,
    active = true,
    onZoom,
    imageAspectRatio,
    paddingTop = 0,
    paddingBottom = 0,
  } = opts;
  const controls = useContext(Context);
  const controlsListen = controls.listen;

  useEffect(() => {
    if (container && active) {
      const panzoom = Panzoom(container, {
        minScale: 1,
        maxScale: 5,
        panOnlyWhenZoomed: true,
        pinchAndPan: true,
        step: 0.8,
        handleStartEvent: (event) => {
          event.preventDefault();
        },
      } satisfies PanzoomOptions);
      const handleZoom = () => {
        const scale = panzoom.getScale();
        if (Math.round(scale) <= 1) {
          panzoom.reset({
            animate: true,
          });
        }
        onZoom?.(scale);
      };
      container.addEventListener("panzoomzoom", handleZoom);
      const handlePan = _.debounce(() => {
        const scale = panzoom.getScale();
        const pan = panzoom.getPan();

        const clientWidth = container.clientWidth;
        const clientHeight = container.clientHeight;

        const imgDimensions = fitContain(
          clientWidth,
          clientHeight - paddingTop - paddingBottom,
          imageAspectRatio,
        );

        // Max Y offset is the diff between the height of the container,
        // and the scaled (zoomed in) height of the image, divided by scale
        // and then halfed.
        const scaledHeight = imgDimensions.height * scale;
        const maxY = (scaledHeight - clientHeight) / scale / 2;

        // Same as Y, but with X
        const scaledWidth = imgDimensions.width * scale;
        const maxX = (scaledWidth - clientWidth) / scale / 2;

        const panY = _.clamp(pan.y, -maxY, maxY);
        const panX = _.clamp(pan.x, -maxX, maxX);

        if (panX !== pan.x || panY !== pan.y) {
          panzoom.pan(panX, panY, {
            animate: true,
          });
        }
      }, 50);
      container.addEventListener("panzoompan", handlePan);
      const unsubscribe = controlsListen((event) => {
        switch (event) {
          case "zoom-in":
            panzoom.zoomIn();
            break;
          case "zoom-out":
            panzoom.zoomOut();
            break;
        }
      });
      return () => {
        unsubscribe();
        onZoom?.(1);
        container.removeEventListener("panzoompan", handlePan);
        container.removeEventListener("panzoomzoom", handleZoom);
        panzoom.destroy();
      };
    }
  }, [
    container,
    controlsListen,
    onZoom,
    active,
    paddingTop,
    paddingBottom,
    imageAspectRatio,
    ...(deps ?? []),
  ]);
}
