import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";
import { ShowNsfwButton, useBlurNsfwState } from "../nsfw-blur-toggle";

export function RedGifEmbed({
  url,
  thumbnail,
  nsfw,
  apId,
  detailView,
}: {
  url: string;
  thumbnail?: string | null;
  autoPlay?: boolean;
  nsfw?: boolean;
  apId?: string;
  detailView?: boolean;
}) {
  const { nsfwHidden, blurClassName, onReveal } = useBlurNsfwState(
    nsfw ?? false,
    { apId, detailView },
  );

  const id = new URL(url).pathname.split("/").pop();

  if (!id) {
    return null;
  }

  return (
    <div className={cn("bg-muted relative", ABOVE_LINK_OVERLAY)}>
      <div className="w-full relative" style={{ paddingBottom: "56.25%" }}>
        {nsfwHidden ? (
          thumbnail && (
            <img
              src={thumbnail}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                blurClassName,
              )}
            />
          )
        ) : (
          <iframe
            src={`https://www.redgifs.com/ifr/${id}`}
            className="absolute inset-0 w-full h-full border-0 md:rounded-md"
            allowFullScreen
            scrolling="no"
            allow="autoplay; fullscreen"
          />
        )}
      </div>

      {nsfwHidden && <ShowNsfwButton onReveal={onReveal} />}
    </div>
  );
}
