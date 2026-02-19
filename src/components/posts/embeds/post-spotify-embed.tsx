import { cn } from "@/src/lib/utils";
import { useMemo } from "react";
import { ABOVE_LINK_OVERLAY } from "../config";

export function SpotifyEmbed({ url }: { url: string }) {
  const embedUrl = useMemo(() => {
    return url.replace(/^https:\/\/open\.spotify\.com\//, "");
  }, [url]);
  return (
    <iframe
      className={cn(
        "rounded-lg bg-muted",
        url.includes("playlist")
          ? "max-md:aspect-square md:aspect-video"
          : "h-[152px] md:h-[232px]",
        ABOVE_LINK_OVERLAY,
      )}
      src={"https://open.spotify.com/embed/" + embedUrl}
    />
  );
}
