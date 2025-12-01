import {
  createContext,
  CSSProperties,
  useCallback,
  useContext,
  useState,
} from "react";
import _ from "lodash";
import { Button } from "@/src/components/ui/button";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "./config";

type Fn = (event: "zoom-in" | "zoom-out") => void;

const Context = createContext<{
  listen: (fn: Fn) => void;
}>({
  listen: _.noop,
});

export function useControls() {
  return useContext(Context);
}

export const Controls = ({
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
