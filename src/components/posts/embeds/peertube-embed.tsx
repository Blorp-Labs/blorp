import { useMemo } from "react";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";
import { ShowNsfwButton, useBlurNsfwState } from "../nsfw-blur-toggle";

export function PeerTubeEmbed({
  url,
  thumbnail,
  nsfw,
  apId,
  detailView,
}: {
  url: string;
  thumbnail?: string | null;
  nsfw?: boolean;
  apId?: string;
  detailView?: boolean;
}) {
  const embedUrl = useMemo(() => {
    return url
      .replace("/videos/watch/", "/videos/embed/")
      .replace("/w/", "/videos/embed/");
  }, [url]);
  const { nsfwHidden, blurClassName, onReveal } = useBlurNsfwState(
    nsfw ?? false,
    { apId, detailView },
  );
  return (
    <div
      className={cn(
        "aspect-video rounded-lg relative overflow-hidden bg-muted",
        ABOVE_LINK_OVERLAY,
      )}
    >
      {nsfwHidden ? (
        <>
          {thumbnail && (
            <img
              src={thumbnail}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                blurClassName,
              )}
            />
          )}
          <ShowNsfwButton onReveal={onReveal} />
        </>
      ) : (
        <iframe
          className="absolute inset-0 w-full h-full rounded-lg"
          src={embedUrl}
          allowFullScreen
        />
      )}
    </div>
  );
}
