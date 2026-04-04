import { useCallback, useState } from "react";
import { Button } from "../ui/button";
import { useNsfwRevealedPostsStore } from "@/src/stores/nsfw-revealed-posts";
import { useNsfwVisibility } from "@/src/hooks/nsfw";

export function useBlurNsfwState(
  nsfw: boolean,
  options?: { apId?: string; detailView?: boolean },
) {
  const visibility = useNsfwVisibility();
  const [revealed, setRevealed] = useState(false);
  const isRevealedByNavigation = useNsfwRevealedPostsStore(
    (s) =>
      !!(options?.detailView && options?.apId && s.isRevealed(options.apId)),
  );

  const revealPost = useNsfwRevealedPostsStore((s) => s.revealPost);

  const nsfwHidden =
    nsfw && visibility !== "show" && !revealed && !isRevealedByNavigation;
  const blurClassName = nsfwHidden ? "blur-3xl" : "";
  const onReveal = useCallback(() => {
    // Shouldn't happen — the page gate blocks access when visibility is "hide".
    // Guard here as a safety net so revealing is never possible in that state.
    if (visibility === "hide") {
      return;
    }
    setRevealed(true);
    if (options?.apId) {
      revealPost(options.apId);
    }
  }, [visibility, options?.apId, revealPost]);

  return { nsfwHidden, blurClassName, onReveal };
}

export function ShowNsfwButton({ onReveal }: { onReveal: () => void }) {
  return (
    <Button
      variant="secondary"
      size="lg"
      className="text-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-8"
      onClick={onReveal}
    >
      Show NSFW
    </Button>
  );
}
