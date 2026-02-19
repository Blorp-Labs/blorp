import { useEffect, useState } from "react";
import { extractLoopsVideoSrc } from "@/src/lib/html-parsing";
import { isTauri } from "@/src/lib/device";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { FiPlay } from "react-icons/fi";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "./config";

const getVideo = async (url: string) => {
  if (isTauri()) {
    try {
      const res = await tauriFetch(url);
      const html = await res.text();
      return extractLoopsVideoSrc(html);
    } catch {
      return undefined;
    }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url,
      });
      return extractLoopsVideoSrc(res.data);
    } catch {
      return undefined;
    }
  }
};

export function PostLoopsEmbed({
  url,
  thumbnail,
  autoPlay = false,
  blurNsfw,
}: {
  url: string;
  thumbnail?: string | null;
  autoPlay?: boolean;
  blurNsfw: boolean;
}) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    getVideo(url).then(setSrc);
  }, [url]);

  const linkOut = !Capacitor.isNativePlatform() && !isTauri();

  const content = (
    <div
      className={cn("bg-muted max-md:contents relative", ABOVE_LINK_OVERLAY)}
    >
      <div className="aspect-[9/16] md:max-w-xs mx-auto relative max-md:-mx-3.5">
        {!src && thumbnail && (
          <img
            src={thumbnail}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              blurNsfw && "blur-3xl",
            )}
          />
        )}
        {!linkOut && src && (
          <video
            src={src}
            controls
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              blurNsfw && "blur-3xl",
            )}
            autoPlay={autoPlay}
            playsInline
            poster={thumbnail ?? undefined}
          />
        )}
      </div>

      {linkOut && (
        <div className="absolute top-1/2 left-1/2 text-4xl bg-black/50 p-5 rounded-full aspect-square -translate-x-1/2 -translate-y-1/2">
          <FiPlay color="white" className="m-auto translate-x-0.5" />
        </div>
      )}

      {blurNsfw && (
        <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
          NSFW
        </div>
      )}
    </div>
  );

  return linkOut ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={ABOVE_LINK_OVERLAY}
    >
      {content}
    </a>
  ) : (
    content
  );
}
