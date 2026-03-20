import { useState } from "react";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { Button } from "../ui/button";

export function useBlurNsfwState(nsfw: boolean) {
  const blurNsfw =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.blurNsfw) ?? true;
  const [revealed, setRevealed] = useState(false);

  const nsfwHidden = nsfw && blurNsfw && !revealed;
  const blurClassName = nsfwHidden ? "blur-3xl" : "";
  const onReveal = () => setRevealed(true);

  return { nsfwHidden, blurClassName, onReveal };
}

export function ShowNsfwButton({ onReveal }: { onReveal: () => void }) {
  return (
    <Button
      variant="secondary"
      size="lg"
      className="text-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-8"
      onClick={(e) => {
        e.stopPropagation();
        onReveal();
      }}
    >
      Show NSFW
    </Button>
  );
}
