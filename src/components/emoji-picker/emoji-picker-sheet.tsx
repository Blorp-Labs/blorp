import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { IonModal } from "@ionic/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Swiper as SwiperType } from "swiper/types";
import "swiper/css";
import { cn } from "@/src/lib/utils";
import { Deferred } from "@/src/lib/deferred";
import { EMOJI_CATEGORIES } from "@/src/lib/emoji-data";

type EmojiPickerContext = {
  open: (deferred: Deferred<string>) => void;
};

const Context = createContext<EmojiPickerContext>({
  open: () => console.error("EmojiPickerSheetProvider not mounted"),
});

export function EmojiPickerSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const deferredRef = useRef<Deferred<string> | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  const open = useCallback((deferred: Deferred<string>) => {
    deferredRef.current = deferred;
    setActiveCategoryIndex(0);
    setIsOpen(true);
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    deferredRef.current?.resolve(emoji);
    deferredRef.current = null;
    setIsOpen(false);
  };

  const handleDismiss = () => {
    if (deferredRef.current) {
      deferredRef.current.reject();
      deferredRef.current = null;
    }
    setIsOpen(false);
  };

  return (
    <Context.Provider value={{ open }}>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={handleDismiss}
        breakpoints={[0, 0.5, 0.92]}
        initialBreakpoint={0.92}
        handleBehavior="cycle"
      >
        <div className="flex flex-col h-full">
          <div className="flex flex-row overflow-x-auto border-b bg-background shrink-0">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => swiperRef.current?.slideTo(i)}
                className={cn(
                  "flex-shrink-0 px-3 py-2 text-xl transition-colors",
                  activeCategoryIndex === i
                    ? "border-b-2 border-primary"
                    : "text-muted-foreground",
                )}
                aria-label={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          <Swiper
            onSwiper={(s) => {
              swiperRef.current = s;
            }}
            onActiveIndexChange={(s) => setActiveCategoryIndex(s.activeIndex)}
            className="flex-1 w-full"
          >
            {EMOJI_CATEGORIES.map((cat) => (
              <SwiperSlide key={cat.id} className="overflow-y-auto h-full">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {cat.label}
                </p>
                <div className="grid grid-cols-8 gap-0 px-2 pb-2">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-2xl p-1.5 rounded-md hover:bg-accent active:bg-accent flex items-center justify-center leading-none"
                      aria-label={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="h-[var(--ion-safe-area-bottom,0px)]" />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </IonModal>
      {children}
    </Context.Provider>
  );
}

export function usePickEmoji(): () => Promise<string> {
  const { open } = useContext(Context);
  return useCallback(() => {
    const deferred = new Deferred<string>();
    open(deferred);
    return deferred.promise;
  }, [open]);
}
