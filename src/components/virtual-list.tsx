import {
  ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Virtualizer, VirtualizerHandle } from "virtua";
import {
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  useIonRouter,
} from "@ionic/react";
import { subscribeToScrollEvent } from "../lib/scroll-events";
import _ from "lodash";
import { useElementHasFocus, useIsInAppBrowserOpen, useMedia } from "../hooks";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useAuth } from "../stores/auth";
import { cn, isNotNil } from "../lib/utils";
// import { COMMENT_COLLAPSE_EVENT } from "./posts/config";
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
  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  useEffect(() => {
    scrollToTop();
  }, [selectedAccountUuid, listKey, scrollToTop]);
}

/**
 * Prevents the scroll container from jumping when a comment is
 * expanded/collapsed by freezing scrollTop for 50ms after the event.
 */
// function usePreventScrollJumpingOnCommentCollapse({
//   container,
// }: {
//   container: HTMLDivElement | null;
// }) {
//   useEffect(() => {
//     if (!container) return;
//
//     let timeoutId: number | undefined;
//     let frozenScrollTop: number | undefined;
//
//     const onScroll = () => {
//       if (frozenScrollTop !== undefined) {
//         container.scrollTop = frozenScrollTop;
//       }
//     };
//
//     const onToggle = () => {
//       frozenScrollTop = container.scrollTop;
//       container.addEventListener("scroll", onScroll, { passive: false });
//       window.clearTimeout(timeoutId);
//       timeoutId = window.setTimeout(() => {
//         container.removeEventListener("scroll", onScroll);
//         frozenScrollTop = undefined;
//       }, 50);
//     };
//
//     container.addEventListener(COMMENT_COLLAPSE_EVENT, onToggle);
//     return () => {
//       container.removeEventListener(COMMENT_COLLAPSE_EVENT, onToggle);
//       container.removeEventListener("scroll", onScroll);
//       window.clearTimeout(timeoutId);
//     };
//   }, [container]);
// }

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
  noItems,
  noItemsComponent,
  paginationControls,
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
  noItems?: boolean;
  noItemsComponent?: ReactNode;
  paginationControls?: ReactNode;
}) {
  const scrollRef = ref;
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const dataLen = data?.length;
  const focused = useElementHasFocus(scrollRef);

  const onFocusChangeEffectEvent = useEffectEvent(onFocusChange ?? _.noop);
  useEffect(() => onFocusChangeEffectEvent?.(focused), [focused]);

  // Measure header height so Virtualizer can correctly determine visible items
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setHeaderHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Map keepMounted items/indices to virtualizer indices
  const keepMountedIndices = useMemo(() => {
    return keepMounted
      ?.map((item) => {
        if (_.isNumber(item)) {
          return numColumns && numColumns > 1
            ? Math.floor(item / numColumns)
            : item;
        }
        if (_.isNil(item) || !data) {
          return undefined;
        }
        const dataIndex = data.indexOf(item);
        if (dataIndex < 0) {
          return undefined;
        }
        return numColumns && numColumns > 1
          ? Math.floor(dataIndex / numColumns)
          : dataIndex;
      })
      .filter(isNotNil);
  }, [keepMounted, data, numColumns]);

  // Chunk data into rows for multi-column layout
  const rows = useMemo(() => {
    if (!numColumns || numColumns <= 1 || !data) {
      return null;
    }
    const result: T[][] = [];
    for (let i = 0; i < data.length; i += numColumns) {
      result.push(Array.from(data).slice(i, i + numColumns) as T[]);
    }
    return result;
  }, [data, numColumns]);

  const showPaginationControls = paginationControls && !noItems;
  const baseDataCount = noItems
    ? 1
    : dataLen || (placeholder ? numPlaceholders : 0);
  const count =
    (rows?.length ?? baseDataCount) + (showPaginationControls ? 1 : 0);

  // Sentinel array for placeholder slots
  const placeholderArr = useMemo(
    () =>
      placeholder
        ? Array.from({ length: numPlaceholders }, () => null as null)
        : null,
    [placeholder, numPlaceholders],
  );

  const virtuaData = noItems
    ? ([null] satisfies null[])
    : ((rows ?? data ?? placeholderArr ?? []) as
        | T[]
        | readonly T[]
        | T[][]
        | null[]);

  // Use a ref so handleVirtuaScroll stays stable without onEndReached as a dep
  const onEndReachedRef = useRef(onEndReached);
  onEndReachedRef.current = onEndReached;

  // Detect end of list via scroll position
  const handleVirtuaScroll = useCallback(() => {
    const v = virtualizerRef.current;
    if (!v || _.isNil(dataLen) || dataLen === 0) {
      return;
    }
    const THRESHOLD = estimatedItemSize * 2;
    if (v.scrollOffset + v.viewportSize >= v.scrollSize - THRESHOLD) {
      onEndReachedRef.current?.();
    }
  }, [dataLen, estimatedItemSize]);

  useScrollToTopEvents({
    focused,
    listKey,
    scrollToTop: useCallback(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [scrollRef]),
  });

  // usePreventScrollJumpingOnCommentCollapse({
  //   container: scrollRef.current,
  // });

  const colWidth = 100 / (numColumns ?? 1);

  return (
    <div style={{ width: "100%" }}>
      {header && header.length > 0 && (
        <div ref={headerRef}>
          {header.map((h, i) => (
            <div
              key={i}
              data-is-sticky-header={
                stickyIndicies?.includes(i) ? "true" : "false"
              }
              className={cn(
                stickyIndicies?.includes(i) && "max-md:bg-background",
              )}
              style={
                stickyIndicies?.includes(i)
                  ? { position: "sticky", top: 0, zIndex: 1 }
                  : undefined
              }
            >
              {h}
            </div>
          ))}
        </div>
      )}
      <Virtualizer
        ref={virtualizerRef}
        scrollRef={scrollRef}
        startMargin={headerHeight}
        itemSize={estimatedItemSize}
        bufferSize={drawDistance}
        keepMounted={keepMountedIndices ?? undefined}
        onScroll={handleVirtuaScroll}
        data={virtuaData as any}
      >
        {(item: unknown, index: number) => {
          if (noItems) {
            return <>{noItemsComponent}</>;
          }
          if (showPaginationControls && index === count - 1) {
            return <>{paginationControls}</>;
          }
          if (rows) {
            const rowItems = item as T[];
            return (
              <div style={{ display: "flex", width: "100%" }}>
                {rowItems.map((col, colIndex) => (
                  <div key={colIndex} style={{ width: `${colWidth}%` }}>
                    {renderItem({
                      item: col,
                      index: index * numColumns! + colIndex,
                    })}
                  </div>
                ))}
              </div>
            );
          }
          if (item === null) {
            return <>{placeholder}</>;
          }
          return <>{renderItem({ item: item as T, index })}</>;
        }}
      </Virtualizer>
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
  noItems?: boolean;
  noItemsComponent?: ReactNode;
  paginationControls?: ReactNode;
}) {
  const media = useMedia();
  const focused = useRef(false);
  const [key, setKey] = useState(0);

  // Bump the key to reset the virtualizer (and its height cache) on scroll-to-top
  // events dispatched by pagination controls. This avoids stale cached item heights
  // from the previous page tripping up the virtualizer on page 1.
  const r = useRouterSafe();
  const pathname = r?.routeInfo?.pathname;
  useEffect(() => {
    if (pathname) {
      return subscribeToScrollEvent(pathname, () => {
        setKey((k) => k + 1);
      });
    }
  }, [pathname]);

  // When the virtual list isn't in the active screen, bump the key to reset
  // the virtualizer rather than relying on VirtualListInternal to scroll to top.
  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  useEffect(() => {
    if (!focused.current) {
      setKey((k) => k + 1);
    }
  }, [selectedAccountUuid, props.listKey]);

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
          "flex-1 overflow-y-scroll overscroll-auto",
          scrollHost && "ion-content-scroll-host h-full",
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
