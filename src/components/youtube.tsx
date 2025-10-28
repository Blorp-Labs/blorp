import { parseYouTubeVideoId } from "../lib/youtube";

import "lite-youtube-embed/src/lite-yt-embed.css";
import "lite-youtube-embed/src/lite-yt-embed.js";

export function YouTubeVideoEmbed({ url }: { url?: string | null }) {
  const videoId = url ? parseYouTubeVideoId(url) : undefined;

  if (!videoId) {
    return null;
  }
  return (
    <div className="aspect-video rounded-xl overflow-hidden">
      {/* @ts-expect-error*/}
      <lite-youtube videoid={videoId} className="max-w-full! w-full" />
    </div>
  );
}
