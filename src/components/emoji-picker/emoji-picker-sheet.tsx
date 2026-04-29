import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { IonModal } from "@ionic/react";
import fuzzysort from "fuzzysort";
import emojilib from "emojilib";
import emojiData from "unicode-emoji-json/data-by-group.json";
import { Deferred } from "@/src/lib/deferred";
import { useEmojiReactionStore } from "@/src/stores/emoji-reactions";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "@/src/lib/utils";
import _ from "lodash";

const MAX_ROWS = 5;
const EMOJI_PX = 40; // matches Button size="icon" (h-10 w-10)
const SEARCH_LIMIT = 40;

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
  const [searchQuery, setSearchQuery] = useState("");
  const deferredRef = useRef<Deferred<string> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recentlyUsed = useEmojiReactionStore((s) => s.recentlyUsed);
  const addRecentEmoji = useEmojiReactionStore((s) => s.addRecentEmoji);

  const open = useCallback((deferred: Deferred<string>) => {
    deferredRef.current = deferred;
    setActiveCategoryIndex(0);
    setSearchQuery("");
    setIsOpen(true);
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    addRecentEmoji(emoji);
    deferredRef.current?.resolve(emoji);
    deferredRef.current = null;
    setIsOpen(false);
  };

  const handleDismiss = () => {
    if (deferredRef.current) {
      deferredRef.current.reject();
      deferredRef.current = null;
    }
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const { scrollLeft } = container;
    let activeIdx = 0;
    sectionRefs.current.forEach((el, i) => {
      if (el && el.offsetLeft <= scrollLeft + 1) {
        activeIdx = i;
      }
    });
    setActiveCategoryIndex(activeIdx);
  }, []);

  const scrollToCategory = useCallback((i: number) => {
    const el = sectionRefs.current[i];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
    }
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery) {
      return [];
    }
    return fuzzysort
      .go(
        searchQuery,
        _.entries(emojilib).map(([emoji, terms]) => ({
          emoji,
          name: terms.join(" "),
        })),
        {
          key: "name",
          limit: SEARCH_LIMIT,
        },
      )
      .map((r) => r.obj.emoji);
  }, [searchQuery]);

  const isSearching = searchQuery.length > 0;

  return (
    <Context.Provider value={{ open }}>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={handleDismiss}
        breakpoints={[0, 0.5]}
        initialBreakpoint={0.5}
      >
        <div className="flex flex-col h-full">
          <div className="px-3 pt-4 pb-2 border-b shrink-0">
            <Input
              type="search"
              placeholder="Search emoji…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {!isSearching && (
            <div className="flex flex-row overflow-x-auto border-b bg-background shrink-0">
              {emojiData.map((cat, i) => (
                <button
                  key={cat.slug}
                  onClick={() => scrollToCategory(i)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 text-xl transition-colors",
                    activeCategoryIndex === i
                      ? "border-b-2 border-primary"
                      : "text-muted-foreground",
                  )}
                  aria-label={cat.name}
                >
                  {cat.emojis[0]?.emoji}
                </button>
              ))}
            </div>
          )}

          {isSearching ? (
            <div className="flex-1 overflow-y-auto ion-content-scroll-host">
              {searchResults.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No emoji found
                </p>
              ) : (
                <div
                  className="grid gap-0 px-2 py-2"
                  style={{
                    gridTemplateColumns: `repeat(${Math.ceil(searchResults.length / MAX_ROWS)}, ${EMOJI_PX}px)`,
                    gridTemplateRows: `repeat(${MAX_ROWS}, ${EMOJI_PX}px)`,
                    gridAutoFlow: "column",
                  }}
                >
                  {searchResults.map((emoji) => (
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
              )}
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 flex flex-row overflow-x-auto ion-content-scroll-host min-h-0"
            >
              {emojiData.map((cat, i) => {
                const emojis =
                  cat.slug === "frequent"
                    ? ([...recentlyUsed] satisfies string[])
                    : cat.emojis;
                const cols = Math.max(4, Math.ceil(emojis.length / MAX_ROWS));
                return (
                  <div
                    key={cat.slug}
                    ref={(el) => {
                      sectionRefs.current[i] = el;
                    }}
                    className="flex flex-col shrink-0 px-2"
                    style={{ width: `${cols * EMOJI_PX}px` }}
                  >
                    <p className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {cat.name}
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: `repeat(${MAX_ROWS}, ${EMOJI_PX}px)`,
                        gridAutoFlow: "column",
                        gridAutoColumns: `${EMOJI_PX}px`,
                      }}
                    >
                      {emojis.map((item) => {
                        const emoji = _.isString(item) ? item : item.emoji;
                        return (
                          <Button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="text-2xl mx-auto"
                            aria-label={emoji}
                            size="icon"
                            variant="ghost"
                          >
                            {emoji}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
