import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  useVirtualizer,
  VirtualItem,
  defaultRangeExtractor,
  Range,
  Virtualizer,
} from "@tanstack/react-virtual";
import {
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  useIonRouter,
} from "@ionic/react";
import { subscribeToScrollEvent } from "../lib/scroll-events";
import _ from "lodash";
import {
  useElementHasFocus,
  useIsInAppBrowserOpen,
  useMedia,
} from "../lib/hooks";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useAuth } from "../stores/auth";
import { cn, isNotNil } from "../lib/utils";
import { COMMENT_COLLAPSE_EVENT } from "./posts/config";
import { useSettingsStore } from "../stores/settings";

export function useScrollToTopEvents({
  scrollToTop,
  listKey,
  focused,
}: {
  scrollToTop: () => void;
  listKey?: string;
  focused: boolean;
}) {
  const isBrowserOpen = useIsInAppBrowserOpen();
  const r = useRouterSafe();
  const pathname = r?.routeInfo?.pathname;
  useEffect(() => {
    if (pathname) {
      return subscribeToScrollEvent(pathname, () => {
        scrollToTop();
      });
    }
  }, [pathname, scrollToTop]);
  useEffect(() => {
    if (focused && !isBrowserOpen) {
      const listener = () => {
        scrollToTop();
      };
      window.addEventListener("statusTap", listener);
      return () => window.removeEventListener("statusTap", listener);
    }
  }, [focused, isBrowserOpen, scrollToTop]);
  const accountIndex = useAuth((s) => s.accountIndex);
  useEffect(() => {
    scrollToTop();
  }, [accountIndex, listKey, scrollToTop]);
}

/**
 * This is a hack that prevents the virtualizer from shifting the
 * scroll for 50ms after a comment is expanded/collapsed
 */
function usePreventScrollJumpingOnCommentCollapse({
  container,
  virtualizer,
}: {
  container: HTMLDivElement | null;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}) {
  useEffect(() => {
    let shouldAdjust = true;
    if (!container) {
      return;
    }

    const { shouldAdjustScrollPositionOnItemSizeChange } = virtualizer;
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (...args) => {
      if (!shouldAdjust) {
        return false;
      }
      return shouldAdjustScrollPositionOnItemSizeChange?.(...args) ?? false;
    };

    let timeoutId: undefined | number;
    const onToggle = () => {
      window.clearTimeout(timeoutId);
      shouldAdjust = false;
      timeoutId = window.setTimeout(() => {
        shouldAdjust = true;
      }, 50);
    };

    container.addEventListener(COMMENT_COLLAPSE_EVENT, onToggle);
    return () => {
      container.removeEventListener(COMMENT_COLLAPSE_EVENT, onToggle);
      virtualizer.shouldAdjustScrollPositionOnItemSizeChange =
        shouldAdjustScrollPositionOnItemSizeChange;
    };
  }, [container]);
}

function useRouterSafe() {
  try {
    return useIonRouter();
  } catch {
    return null;
  }
}

function VirtualListInternal<T>({
  data,
  estimatedItemSize,
  onEndReached,
  renderItem,
  stickyIndicies,
  keepMounted,
  ref,
  drawDistance,
  numColumns,
  onFocusChange,
  placeholder,
  numPlaceholders = 25,
  header,
  listKey,
}: {
  data?: T[] | readonly T[];
  estimatedItemSize: number;
  onEndReached?: () => any;
  renderItem: (params: { item: T; index: number }) => React.ReactNode;
  keepMounted?: (number | T | undefined)[];
  stickyIndicies?: number[];
  ref: React.RefObject<HTMLDivElement | null>;
  drawDistance?: number;
  numColumns?: number;
  onFocusChange?: (focused: boolean) => any;
  placeholder?: ReactNode;
  numPlaceholders?: number;
  header?: ReactNode[];
  listKey?: string;
}) {
  const index = useRef(0);
  const offset = useRef(0);
  const cache = useRef<VirtualItem[]>([]);

  const scrollRef = ref;

  const initialItem = cache.current?.[index.current];

  const dataLen = data?.length;

  const activeStickyIndexRef = useRef(-1);

  const isActiveSticky = (index: number) =>
    activeStickyIndexRef.current === index;

  const overscan =
    drawDistance && estimatedItemSize
      ? Math.round(drawDistance / estimatedItemSize)
      : undefined;

  const focused = useElementHasFocus(scrollRef);

  useEffect(() => onFocusChange?.(focused), [focused]);

  let count = dataLen || (placeholder ? numPlaceholders : 0);
  if (header) {
    count += header.length;
  }
  const headerLen = header?.length ?? 0;
  const rowVirtualizer = useVirtualizer({
    count,
    overscan,
    lanes: numColumns === 1 ? undefined : numColumns,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => cache.current?.[index]?.size ?? estimatedItemSize,
    onChange: (instance) => {
      if (
        scrollRef.current &&
        scrollRef.current?.getBoundingClientRect().height > 0
      ) {
        cache.current = instance.measurementsCache;
        const scrollOffset = instance?.scrollOffset ?? 0;
        const firstItem = instance
          .getVirtualItems()
          .find((item) => item.start >= scrollOffset);

        index.current = firstItem?.index ?? 0;
        offset.current = firstItem ? scrollOffset - firstItem.start : 0;
      }
    },
    initialMeasurementsCache: cache.current,
    initialOffset: initialItem ? initialItem.start + offset.current : 0,
    enabled: focused,
    rangeExtractor: useCallback(
      (range: Range) => {
        if (!stickyIndicies) {
          return defaultRangeExtractor(range);
        }

        activeStickyIndexRef.current =
          [...stickyIndicies]
            .reverse()
            .find((index) => range.startIndex >= index) ?? -1;

        const keepMountedIndices = keepMounted
          ?.map((item) => {
            if (_.isNumber(item)) {
              return item;
            }
            if (_.isNil(item) || !data) {
              return undefined;
            }

            const dataIndex = data.indexOf(item);
            if (dataIndex >= 0) {
              return dataIndex + headerLen;
            }

            return undefined;
          })
          .filter(isNotNil);

        const headerIndicies = Array.from({ length: headerLen }).map(
          (_, i) => i,
        );

        const all = new Set<number>([
          ...headerIndicies,
          ...(stickyIndicies ?? []),
          ...(keepMountedIndices ?? []),
          ...defaultRangeExtractor(range),
        ]);

        return Array.from(all).sort((a, b) => a - b);
      },
      [stickyIndicies, keepMounted, data, headerLen],
    ),
  });

  const scrollToOffset = rowVirtualizer.scrollToOffset;
  useScrollToTopEvents({
    focused,
    listKey,
    scrollToTop: useCallback(() => {
      scrollToOffset(0, { behavior: "smooth" });
    }, [scrollToOffset]),
  });

  usePreventScrollJumpingOnCommentCollapse({
    container: scrollRef.current,
    virtualizer: rowVirtualizer,
  });

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem || _.isNil(dataLen)) {
      return;
    }
    if (lastItem.index >= dataLen - 1) {
      onEndReached?.();
    }
  }, [dataLen, rowVirtualizer.getVirtualItems(), onEndReached]);

  const colWidth = 100 / (numColumns ?? 1);

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {/* Only the visible items in the virtualizer, manually positioned to be in view */}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        let index = virtualItem.index;
        if (header) {
          index -= header.length;
        }
        const item = data?.[index];

        const showHeader = header && virtualItem.index < header?.length;

        const isStuck = isActiveSticky(virtualItem.index);

        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            data-is-sticky-header={isStuck}
            ref={rowVirtualizer.measureElement}
            className={cn(isStuck && "max-md:bg-background")}
            style={
              isStuck
                ? {
                    position: "sticky",
                    zIndex: 1,
                    top: 0,
                  }
                : {
                    position: "absolute",
                    top: 0,
                    left: `${colWidth * virtualItem.lane}%`,
                    width: `${colWidth}%`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }
            }
          >
            {item
              ? renderItem?.({
                  item,
                  index,
                })
              : showHeader
                ? header[virtualItem.index]
                : placeholder}
          </div>
        );
      })}
    </div>
  );
}

export function VirtualList<T>({
  ref,
  onFocusChange,
  className,
  onScroll,
  refresh,
  scrollHost,
  fullscreen,
  ...props
}: {
  data?: T[] | readonly T[];
  estimatedItemSize: number;
  onEndReached?: () => any;
  renderItem: (params: { item: T; index: number }) => React.ReactNode;
  keepMounted?: (number | T | undefined)[];
  stickyIndicies?: number[];
  ref?: React.RefObject<HTMLDivElement | null>;
  drawDistance?: number;
  numColumns?: number;
  className?: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => any;
  onFocusChange?: (focused: boolean) => any;
  refresh?: () => Promise<any>;
  placeholder?: ReactNode;
  numPlaceholders?: number;
  header?: ReactNode[];
  fullscreen?: boolean;
  scrollHost?: boolean;
  listKey?: string;
}) {
  const media = useMedia();
  const focused = useRef(false);
  const [key, setKey] = useState(0);

  // When the virtual list isn't in the active
  // screen, it's better to bump the key and reset
  // the virtualizer. Otherwise scroll events are
  // handled by VirtualListInternal by smoothly
  // scrolling to the top.
  const accountIndex = useAuth((s) => s.accountIndex);
  useEffect(() => {
    if (!focused.current) {
      setKey((k) => k + 1);
    }
  }, [accountIndex, props.listKey]);

  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = ref ?? internalRef;

  const disableHaptics = useSettingsStore((s) => s.disableHaptics);

  function handleRefresh(event: CustomEvent<RefresherEventDetail>) {
    if (!disableHaptics) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
    refresh?.().finally(() => event.detail.complete());
  }

  const numCols = props.numColumns ?? 1;

  return (
    // Hide refresher on large screen sizes, because it kept
    // getting triggered by my mouse
    <>
      {refresh && media.maxMd && (
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "overflow-y-scroll overscroll-auto flex-1",
          scrollHost && "h-full ion-content-scroll-host",
          fullscreen &&
            "max-md:absolute max-md:inset-0 max-md:pt-[var(--offset-top)] max-md:pb-[var(--offset-bottom)]",
          className,
        )}
        style={{
          scrollbarGutter: media.xxl
            ? numCols > 1
              ? "stable"
              : "stable both-edges"
            : undefined,
        }}
        onScroll={onScroll}
      >
        <VirtualListInternal
          listKey={`${key}-${props.numColumns}`}
          {...props}
          ref={scrollRef}
          onFocusChange={(newFocused) => {
            focused.current = newFocused;
            onFocusChange?.(newFocused);
          }}
        />
      </div>
    </>
  );
}
