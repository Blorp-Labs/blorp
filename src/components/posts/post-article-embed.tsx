import { openUrl } from "@tauri-apps/plugin-opener";
import {
  InAppBrowser,
  DefaultSystemBrowserOptions,
} from "@capacitor/inappbrowser";
import { isCapacitor, isTauri } from "@/src/lib/device";
import { cn } from "@/src/lib/utils";
import { Capacitor } from "@capacitor/core";
import { Skeleton } from "../ui/skeleton";
import { MouseEventHandler, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

function getDisplayUrl(url: string) {
  try {
    let displayUrl = url;
    if (displayUrl) {
      const parsedUrl = new URL(displayUrl);
      displayUrl = `${parsedUrl.host.replace(/^www\./, "")}${parsedUrl.pathname.replace(/\/$/, "")}`;
    }
    return displayUrl;
  } catch {
    return url;
  }
}

function getLinkHandler(
  url?: string | null,
): MouseEventHandler<HTMLAnchorElement> {
  return (e) => {
    if (!url) {
      return;
    }

    if (isTauri()) {
      e.preventDefault();
      openUrl(url);
    } else if (isCapacitor()) {
      e.preventDefault();
      InAppBrowser.openInSystemBrowser({
        url,
        options: {
          ...DefaultSystemBrowserOptions,
          iOS: {
            ...DefaultSystemBrowserOptions.iOS,
            enableReadersMode: true,
          },
        },
      });
    }
  };
}

export function PostArticleMiniEmbed({
  url,
  thumbnail,
  blurNsfw,
  className,
}: {
  url?: string | null;
  thumbnail?: string | null;
  blurNsfw: boolean;
  className?: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={getLinkHandler(url)}
      style={{
        display: !url ? "none" : undefined,
      }}
      className={cn(
        "flex flex-col relative overflow-hidden",
        !thumbnail && "bg-secondary",
        className,
      )}
    >
      {thumbnail && (
        <>
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 rounded-b-none rounded-t-xl" />
          )}
          <img
            src={thumbnail}
            className={cn(
              "absolute inset-0 object-cover w-full h-full aspect-video rounded-t-xl",
              blurNsfw && "blur-3xl",
            )}
            onLoad={() => setImageLoaded(true)}
          />
          {blurNsfw && (
            <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
              NSFW
            </div>
          )}
        </>
      )}
      <FaExternalLinkAlt
        className={cn(
          "text-white text-3xl m-auto relative",
          !thumbnail && "text-muted-foreground",
        )}
      />
    </a>
  );
}

export function PostArticleEmbed({
  url,
  thumbnail,
  blurNsfw,
}: {
  url?: string | null;
  thumbnail?: string | null;
  blurNsfw: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={getLinkHandler(url)}
      style={{
        display: !url ? "none" : undefined,
      }}
      className="flex flex-col"
    >
      {thumbnail && (
        <div className="relative aspect-video overflow-hidden">
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 rounded-b-none rounded-t-xl" />
          )}
          <img
            src={thumbnail}
            className={cn(
              "absolute inset-0 object-cover w-full h-full aspect-video rounded-t-xl",
              blurNsfw && "blur-3xl",
            )}
            onLoad={() => setImageLoaded(true)}
          />
          {blurNsfw && (
            <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
              NSFW
            </div>
          )}
        </div>
      )}
      {url && (
        <div
          className={cn(
            "p-3 bg-zinc-200 dark:bg-zinc-800 truncate text-ellipsis rounded-b-xl text-sm text-zinc-500",
            !thumbnail && "rounded-t-xl",
          )}
        >
          <span className="line-clamp-1">{getDisplayUrl(url)}</span>
        </div>
      )}
    </a>
  );
}
