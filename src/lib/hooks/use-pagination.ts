import { useEffect, useRef, useState } from "react";
import { useIonRouter } from "@ionic/react";
import { dispatchScrollEvent } from "../scroll-events";

export type PaginationControlsProps = {
  currentPage: number;
  discoveredPageCount: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  isFetchingNextPage: boolean;
};

function useRouterSafe() {
  try {
    return useIonRouter();
  } catch {
    return null;
  }
}

export function usePagination<Page, Item>({
  pages,
  getItems,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  mode,
  listKey,
}: {
  pages: Page[] | undefined;
  getItems: (page: Page) => Item[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  mode: "infinite" | "pages";
  listKey?: string;
}): {
  flatData: Item[];
  onEndReached?: () => void;
  paginationProps: PaginationControlsProps;
} {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pendingNextPage, setPendingNextPage] = useState(false);
  const prevPagesLengthRef = useRef(pages?.length ?? 0);

  const router = useRouterSafe();

  // Reset on listKey change
  const listKeyRef = useRef(listKey);
  useEffect(() => {
    if (listKeyRef.current !== listKey) {
      listKeyRef.current = listKey;
      setCurrentPageIndex(0);
      setPendingNextPage(false);
    }
  }, [listKey]);

  // Advance to newly fetched page when pending
  useEffect(() => {
    const newLength = pages?.length ?? 0;
    if (pendingNextPage && newLength > prevPagesLengthRef.current) {
      const newIndex = newLength - 1;
      setCurrentPageIndex(newIndex);
      setPendingNextPage(false);
      const pathname = router?.routeInfo?.pathname;
      if (pathname) {
        dispatchScrollEvent(pathname);
      }
    }
    prevPagesLengthRef.current = newLength;
  }, [pages?.length, pendingNextPage, router]);

  // Pages mode: prefetch the next page while the user is reading the current one
  const discoveredPageCount = pages?.length ?? 0;
  const safeIndex = Math.min(
    currentPageIndex,
    Math.max(0, discoveredPageCount - 1),
  );
  useEffect(() => {
    if (
      mode === "pages" &&
      safeIndex === discoveredPageCount - 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !pendingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    mode,
    safeIndex,
    discoveredPageCount,
    hasNextPage,
    isFetchingNextPage,
    pendingNextPage,
    fetchNextPage,
  ]);

  if (mode === "infinite") {
    const flatData = pages ? pages.flatMap(getItems) : [];
    const onEndReached =
      hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined;
    return {
      flatData,
      onEndReached,
      paginationProps: {
        currentPage: 0,
        discoveredPageCount: 1,
        hasNextPage,
        onPageChange: () => {},
        isFetchingNextPage,
      },
    };
  }

  // Pages mode
  const flatData = pages && pages[safeIndex] ? getItems(pages[safeIndex]) : [];

  const onPageChange = (page: number) => {
    if (pages && page < pages.length) {
      setCurrentPageIndex(page);
      const pathname = router?.routeInfo?.pathname;
      if (pathname) {
        dispatchScrollEvent(pathname);
      }
    } else if (page === (pages?.length ?? 0) && hasNextPage) {
      fetchNextPage();
      setPendingNextPage(true);
    }
  };

  return {
    flatData,
    onEndReached: undefined,
    paginationProps: {
      currentPage: safeIndex,
      discoveredPageCount,
      hasNextPage,
      onPageChange,
      isFetchingNextPage,
    },
  };
}
