import { LuLoaderCircle } from "react-icons/lu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { ContentGutters } from "./gutters";
import { type PaginationControlsProps } from "../lib/hooks/use-pagination";

export type { PaginationControlsProps };

function getVisiblePages(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const set = new Set<number>();
  for (const p of [0, total - 1, current - 1, current, current + 1]) {
    if (p >= 0 && p < total) {
      set.add(p);
    }
  }

  const sorted: number[] = Array.from(set).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i] as number;
    const prev = sorted[i - 1] as number | undefined;
    if (i > 0 && prev !== undefined && cur - prev > 1) {
      result.push("ellipsis");
    }
    result.push(cur);
  }

  return result;
}

export function PaginationControls({
  currentPage,
  discoveredPageCount,
  hasNextPage,
  onPageChange,
  isFetchingNextPage,
}: PaginationControlsProps) {
  const visiblePages = getVisiblePages(currentPage, discoveredPageCount);
  const isFirstPage = currentPage === 0;
  const isLastKnownPage =
    currentPage === discoveredPageCount - 1 && !hasNextPage;

  return (
    <ContentGutters className="py-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              size="default"
              onClick={
                isFirstPage ? undefined : () => onPageChange(currentPage - 1)
              }
              aria-disabled={isFirstPage}
              className={
                isFirstPage ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>

          {visiblePages.map((page, i) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  size="icon"
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page)}
                >
                  {page + 1}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            {isFetchingNextPage ? (
              <span className="flex h-9 items-center gap-1 px-2.5 text-sm">
                <span>Next</span>
                <LuLoaderCircle className="animate-spin h-4 w-4" />
              </span>
            ) : (
              <PaginationNext
                size="default"
                onClick={
                  isLastKnownPage
                    ? undefined
                    : () => onPageChange(currentPage + 1)
                }
                aria-disabled={isLastKnownPage}
                className={
                  isLastKnownPage ? "pointer-events-none opacity-50" : undefined
                }
              />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <></>
    </ContentGutters>
  );
}
