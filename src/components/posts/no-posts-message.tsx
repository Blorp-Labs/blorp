import { ContentGutters } from "../gutters";

export function NoPostsMessage({
  isBlocked,
  blockedName,
  postSort,
  suggestedPostSort,
  setPostSort,
  showSortHint = true,
}: {
  isBlocked?: boolean;
  blockedName?: string;
  postSort: string;
  suggestedPostSort: string | undefined;
  setPostSort: (sort: string) => void;
  showSortHint?: boolean;
}) {
  return (
    <ContentGutters>
      <div className="flex-1 italic text-muted-foreground p-6 text-center">
        {isBlocked ? (
          <span>You have {blockedName} blocked</span>
        ) : showSortHint &&
          suggestedPostSort !== undefined &&
          postSort !== suggestedPostSort ? (
          <span>
            No posts for &ldquo;{postSort}&rdquo; sort. Try switching to{" "}
            <button
              className="not-italic underline"
              onClick={() => setPostSort(suggestedPostSort)}
            >
              &ldquo;{suggestedPostSort}&rdquo;
            </button>
            .
          </span>
        ) : (
          <span>Nothing to see here</span>
        )}
      </div>
      <></>
    </ContentGutters>
  );
}
