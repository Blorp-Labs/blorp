import { ReactNode, useEffect, useRef, useState } from "react";
import { useIonRouter } from "@ionic/react";
import { dispatchScrollEvent } from "../scroll-events";
import {
  PaginationControls,
  PaginationControlsProps,
} from "../../components/pagination-controls";

export type { PaginationControlsProps };

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
  paginationControls: ReactNode;
} {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const router = useRouterSafe();

  // Reset on listKey change
  const listKeyRef = useRef(listKey);
  useEffect(() => {
    if (listKeyRef.current !== listKey) {
      listKeyRef.current = listKey;
      setCurrentPageIndex(0);
    }
  }, [listKey]);

  // Pages mode: prefetch the next page while the user is reading the current one
  const fetchedPageCount = pages?.length ?? 0;
  const discoveredPageCount = Math.max(fetchedPageCount, currentPageIndex + 1);
  useEffect(() => {
    if (
      mode === "pages" &&
      currentPageIndex === fetchedPageCount - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    mode,
    currentPageIndex,
    fetchedPageCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  if (mode === "infinite") {
    const flatData = pages ? pages.flatMap(getItems) : [];
    const onEndReached =
      hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined;
    return {
      flatData,
      onEndReached,
      paginationControls: undefined,
    };
  }

  // Pages mode
  const flatData =
    pages && pages[currentPageIndex] ? getItems(pages[currentPageIndex]) : [];

  const onPageChange = (page: number) => {
    setCurrentPageIndex(page);
    if (page >= fetchedPageCount && hasNextPage) {
      fetchNextPage();
    }
    const pathname = router?.routeInfo?.pathname;
    if (pathname) {
      dispatchScrollEvent(pathname);
    }
  };

  return {
    flatData,
    onEndReached: undefined,
    paginationControls: (
      <PaginationControls
        currentPage={currentPageIndex}
        discoveredPageCount={discoveredPageCount}
        hasNextPage={hasNextPage}
        onPageChange={onPageChange}
        isFetchingNextPage={isFetchingNextPage}
      />
    ),
  };
}
