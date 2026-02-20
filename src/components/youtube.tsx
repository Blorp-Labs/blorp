import { parseYouTubeVideoId } from "../lib/youtube";
import { cn } from "../lib/utils";

import "lite-youtube-embed/src/lite-yt-embed.css";
import "lite-youtube-embed/src/lite-yt-embed.js";

export function YouTubeVideoEmbed({
  url,
  className,
}: {
  url?: string | null;
  className?: string;
}) {
  const videoId = url ? parseYouTubeVideoId(url) : undefined;

  if (!videoId) {
    return null;
  }
  return (
    <div className={cn("aspect-video rounded-xl overflow-hidden", className)}>
      {/* @ts-expect-error*/}
      <lite-youtube videoid={videoId} className="max-w-full! w-full" />
    </div>
  );
}
