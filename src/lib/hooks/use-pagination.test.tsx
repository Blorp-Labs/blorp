import { describe, test, expect, vi, afterEach } from "vitest";
import {
  renderHook,
  render,
  screen,
  fireEvent,
  act,
  cleanup,
  within,
} from "@testing-library/react";

afterEach(cleanup);
import { usePagination } from "./use-pagination";

type MockPage = { items: string[] };

const getItems = (p: MockPage) => p.items;

function makePage(...items: string[]): MockPage {
  return { items };
}

// Renders usePagination and exposes flatData and paginationControls to the DOM
// so navigation tests can query and click pagination buttons.
function PaginationHarness({
  pages,
  mode,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  listKey,
}: {
  pages: MockPage[] | undefined;
  mode: "infinite" | "pages";
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  listKey?: string;
}) {
  const { flatData, onEndReached, paginationControls } = usePagination({
    pages,
    getItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    mode,
    listKey,
  });
  return (
    <div>
      <div data-testid="flat-data">{flatData.join(",")}</div>
      <div data-testid="on-end-reached">
        {onEndReached ? "defined" : "undefined"}
      </div>
      {paginationControls}
    </div>
  );
}

// ─── Infinite mode ────────────────────────────────────────────────────────────

describe("usePagination - infinite mode", () => {
  test("flatData aggregates all pages", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a", "b"), makePage("c", "d")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        mode: "infinite",
      }),
    );
    expect(result.current.flatData).toEqual(["a", "b", "c", "d"]);
  });

  test("flatData is empty when pages is undefined", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: undefined,
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        mode: "infinite",
      }),
    );
    expect(result.current.flatData).toEqual([]);
  });

  test("onEndReached calls fetchNextPage when hasNextPage and not fetching", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        mode: "infinite",
      }),
    );
    expect(result.current.onEndReached).toBeDefined();
    result.current.onEndReached?.();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("onEndReached is undefined while fetching next page", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: true,
        mode: "infinite",
      }),
    );
    expect(result.current.onEndReached).toBeUndefined();
  });

  test("onEndReached is undefined when there is no next page", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        mode: "infinite",
      }),
    );
    expect(result.current.onEndReached).toBeUndefined();
  });

  test("paginationControls is undefined", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        mode: "infinite",
      }),
    );
    expect(result.current.paginationControls).toBeUndefined();
  });
});

// ─── Pages mode ───────────────────────────────────────────────────────────────

describe("usePagination - pages mode", () => {
  test("flatData shows only the first page initially", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a", "b"), makePage("c", "d")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        mode: "pages",
      }),
    );
    expect(result.current.flatData).toEqual(["a", "b"]);
  });

  test("onEndReached is undefined", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        mode: "pages",
      }),
    );
    expect(result.current.onEndReached).toBeUndefined();
  });

  test("paginationControls is defined", () => {
    const { result } = renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        mode: "pages",
      }),
    );
    expect(result.current.paginationControls).toBeDefined();
  });

  test("prefetches next page when on the last discovered page", () => {
    const fetchNextPage = vi.fn();
    renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        mode: "pages",
      }),
    );
    // safeIndex (0) === discoveredPageCount - 1 (0) with hasNextPage → prefetch fires
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("does not prefetch when already fetching", () => {
    const fetchNextPage = vi.fn();
    renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: true,
        mode: "pages",
      }),
    );
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  test("does not prefetch when there is no next page", () => {
    const fetchNextPage = vi.fn();
    renderHook(() =>
      usePagination({
        pages: [makePage("a")],
        getItems,
        fetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
        mode: "pages",
      }),
    );
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  test("clicking Next navigates to an already-fetched second page", () => {
    const pages = [makePage("a", "b"), makePage("c", "d")];

    const { container } = render(
      <PaginationHarness
        pages={pages}
        mode="pages"
        fetchNextPage={vi.fn()}
        hasNextPage={false}
        isFetchingNextPage={false}
      />,
    );
    const view = within(container);

    expect(view.getByTestId("flat-data").textContent).toBe("a,b");

    fireEvent.click(view.getByLabelText("Go to next page"));

    expect(view.getByTestId("flat-data").textContent).toBe("c,d");
  });

  test("clicking Previous goes back to the first page", () => {
    const pages = [makePage("a", "b"), makePage("c", "d")];

    const { container } = render(
      <PaginationHarness
        pages={pages}
        mode="pages"
        fetchNextPage={vi.fn()}
        hasNextPage={false}
        isFetchingNextPage={false}
      />,
    );
    const view = within(container);

    fireEvent.click(view.getByLabelText("Go to next page"));
    expect(view.getByTestId("flat-data").textContent).toBe("c,d");

    fireEvent.click(view.getByLabelText("Go to previous page"));
    expect(view.getByTestId("flat-data").textContent).toBe("a,b");
  });

  test("clicking Next past the last fetched page calls fetchNextPage", () => {
    // Start with isFetchingNextPage=true so the prefetch effect does not fire.
    const fetchNextPage = vi.fn();
    const { container, rerender } = render(
      <PaginationHarness
        pages={[makePage("a", "b")]}
        mode="pages"
        fetchNextPage={fetchNextPage}
        hasNextPage={true}
        isFetchingNextPage={true}
      />,
    );
    expect(fetchNextPage).not.toHaveBeenCalled();

    // Unblock fetching so the Next button becomes active.
    act(() => {
      rerender(
        <PaginationHarness
          pages={[makePage("a", "b")]}
          mode="pages"
          fetchNextPage={fetchNextPage}
          hasNextPage={true}
          isFetchingNextPage={false}
        />,
      );
    });

    // Now clicking Next should trigger fetchNextPage for the undiscovered page.
    fireEvent.click(within(container).getByLabelText("Go to next page"));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  test("advancing to a pending page once it resolves", () => {
    // Start: 1 page fetched, pending=true after clicking Next
    const fetchNextPage = vi.fn();
    const { container, rerender } = render(
      <PaginationHarness
        pages={[makePage("a", "b")]}
        mode="pages"
        fetchNextPage={fetchNextPage}
        hasNextPage={true}
        isFetchingNextPage={true}
      />,
    );

    // Enable Next and click it to enter pending state
    act(() => {
      rerender(
        <PaginationHarness
          pages={[makePage("a", "b")]}
          mode="pages"
          fetchNextPage={fetchNextPage}
          hasNextPage={true}
          isFetchingNextPage={false}
        />,
      );
    });
    fireEvent.click(within(container).getByLabelText("Go to next page"));

    // Simulate the new page arriving
    act(() => {
      rerender(
        <PaginationHarness
          pages={[makePage("a", "b"), makePage("c", "d")]}
          mode="pages"
          fetchNextPage={fetchNextPage}
          hasNextPage={false}
          isFetchingNextPage={false}
        />,
      );
    });

    expect(within(container).getByTestId("flat-data").textContent).toBe("c,d");
  });
});

// ─── listKey reset ────────────────────────────────────────────────────────────

describe("usePagination - listKey reset", () => {
  test("changing listKey resets to the first page", () => {
    const pages = [makePage("a", "b"), makePage("c", "d")];

    const { container, rerender } = render(
      <PaginationHarness
        pages={pages}
        mode="pages"
        fetchNextPage={vi.fn()}
        hasNextPage={false}
        isFetchingNextPage={false}
        listKey="sort-hot"
      />,
    );
    const view = within(container);

    // Advance to page 2
    fireEvent.click(view.getByLabelText("Go to next page"));
    expect(view.getByTestId("flat-data").textContent).toBe("c,d");

    // Change listKey (e.g. user changed sort)
    act(() => {
      rerender(
        <PaginationHarness
          pages={pages}
          mode="pages"
          fetchNextPage={vi.fn()}
          hasNextPage={false}
          isFetchingNextPage={false}
          listKey="sort-new"
        />,
      );
    });

    expect(view.getByTestId("flat-data").textContent).toBe("a,b");
  });
});
